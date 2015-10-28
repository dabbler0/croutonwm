# Figure out what the terminal app is
chrome.management.getAll (apps) ->
  terminalId = null
  for app in apps
    if app.name is 'Secure Shell'
      terminalId = app.id

  terminalURL = 'chrome-extension://' + terminalId + '/html/crosh.html'

  chrome.commands.onCommand.addListener (command) ->
    if command is 'open-terminal'
      childWindow = window.open terminalURL, '_blank', 'titlebar=no,toolbar=no'
      childWindow.document.getElementById('terminal').focus()
      ###
      chrome.windows.create {
        url: 'chrome-extension://' + terminalId + '/html/crosh.html'
        type: 'popup'
        focused: true
      }, ->
        # Allow the user to type immediately
        chrome.tabs.executeScript
          code: 'document.getElementById("terminal").focus();'
      ###

class MonocleLayout
  constructor: (@master, @stacked) ->

  hide: ->
    if @master?
      chrome.windows.update @master, {
        state: 'minimized'
      }
    for stacked in @stacked
      chrome.windows.update stacked, {
        state: 'minimized'
      }

  validate: (cb)->
    validateList @stacked, (stacked, changed) =>
      @stacked = stacked
      cb changed

  update: ->
    console.log 'updating monocle layout'
    if @master?
      chrome.windows.update @master, {
          left: 0
          top: 0
          width: screen.width
          height: screen.height
          state: 'normal'
      }
    for stacked in @stacked
      chrome.windows.update stacked, {
        left: 0
        top: 0
        width: screen.width
        height: screen.height
        state: 'normal'
      }

    @validate (changed) ->
      if changed
        @update()

validateList = (list, cb, i = 0, filtered = [], changed = false) ->
  if i is list.length
    cb filtered, changed
  else
    chrome.windows.get list[i], {populate: false}, (window) ->
      if window?
        filtered.push list[i]
      else
        changed = true
      validateList list, cb, i + 1, filtered, changed

class RightStackLayout
  constructor: (@master, @stacked) ->

  hide: ->
    if @master?
      chrome.windows.update @master, {
        state: 'minimized'
      }
    for stacked in @stacked
      chrome.windows.update stacked, {
        state: 'minimized'
      }

  validate: (cb)->
    validateList @stacked, (stacked, changed) =>
      @stacked = stacked
      cb changed

  update: ->
    if @stacked.length > 0
      chrome.windows.update(@master, {
        left: 0
        top: 0
        width: Math.round screen.width / 2
        height: screen.height
        state: 'normal'
      })

      for stacked, i in @stacked
        chrome.windows.update(stacked, {
          left: Math.round screen.width / 2
          top: Math.round (i / @stacked.length) * screen.height
          width: Math.round screen.width / 2
          height: Math.round screen.height / @stacked.length
          state: 'normal'
        })
    else if @master?
      chrome.windows.update(@master, {
        left: 0
        top: 0
        width: screen.width
        height: screen.height
      })

    @validate (changed) ->
      if changed
        @update()

LAYOUTS = for [0..9]
  new RightStackLayout null, []

currentDesktop = 1

chrome.windows.getAll {populate: false}, (windows) ->
  master = null; stacked = []
  for window in windows
    if window.focused
      master = window.id
    else
      stacked.push window.id

  LAYOUTS[currentDesktop].master = master
  LAYOUTS[currentDesktop].stacked = stacked

  chrome.windows.onCreated.addListener (window) ->
    if LAYOUTS[currentDesktop].master?
      LAYOUTS[currentDesktop].stacked.unshift LAYOUTS[currentDesktop].master
    LAYOUTS[currentDesktop].master = window.id
    LAYOUTS[currentDesktop].update()

  chrome.windows.onRemoved.addListener (id) ->
    if id is LAYOUTS[currentDesktop].master
      LAYOUTS[currentDesktop].master = LAYOUTS[currentDesktop].stacked.shift()
    else
      LAYOUTS[currentDesktop].stacked = LAYOUTS[currentDesktop].stacked.filter (x) -> x isnt id
    chrome.windows.update LAYOUTS[currentDesktop].master, {
      focused: true
    }
    LAYOUTS[currentDesktop].update()

chrome.commands.onCommand.addListener (command) ->
  console.log 'got', command
  if command is 'make-master'
    chrome.windows.getLastFocused({populate: false}, (window) ->
      unless window.id is LAYOUTS[currentDesktop].master
        LAYOUTS[currentDesktop].stacked = LAYOUTS[currentDesktop].stacked.filter (x) -> x isnt window.id
        LAYOUTS[currentDesktop].stacked.unshift LAYOUTS[currentDesktop].master
        LAYOUTS[currentDesktop].master = window.id
        LAYOUTS[currentDesktop].update()
    )

  else if command is 'rotate-window'
    chrome.windows.getLastFocused({populate: false}, (window) ->
      if window? and LAYOUTS[currentDesktop].master?
        if window.id is LAYOUTS[currentDesktop].master and
              LAYOUTS[currentDesktop].stacked.length > 0
            chrome.windows.update LAYOUTS[currentDesktop].stacked[0], {
              focused: true
            }
        else
          index = LAYOUTS[currentDesktop].stacked.indexOf window.id
          if index is LAYOUTS[currentDesktop].stacked.length - 1
            chrome.windows.update LAYOUTS[currentDesktop].master, {
              focused: true
            }
          else
            chrome.windows.update LAYOUTS[currentDesktop].stacked[index + 1], {
              focused: true
            }
    )

  else if command is 'close-window'
    chrome.windows.getLastFocused({populate: false}, (window) ->
      chrome.windows.remove window.id
    )
  else if command is 'switch-layout'
    if LAYOUTS[currentDesktop] instanceof RightStackLayout
      console.log 'switching to monocle'
      LAYOUTS[currentDesktop] = new MonocleLayout LAYOUTS[currentDesktop].master, LAYOUTS[currentDesktop].stacked
      LAYOUTS[currentDesktop].update()

    else if LAYOUTS[currentDesktop] instanceof MonocleLayout
      console.log 'switching to right-stack'
      LAYOUTS[currentDesktop] = new RightStackLayout LAYOUTS[currentDesktop].master, LAYOUTS[currentDesktop].stacked
      LAYOUTS[currentDesktop].update()

  else if command is 'open-chrome'
    chrome.windows.create()

  else if command.match(/desktop-\d/)?
    LAYOUTS[currentDesktop].hide()
    currentDesktop = Number(command[8])
    console.log 'on desktop', currentDesktop
    LAYOUTS[currentDesktop].validate ->
      LAYOUTS[currentDesktop].update()
      chrome.windows.update LAYOUTS[currentDesktop].master, {
        focused: true
      }

  else if command.match(/send-\d/)?
    console.log 'send to desktop', Number(command[8])
    chrome.windows.getLastFocused {populate: false}, (window) ->
      id = window.id
      if id is LAYOUTS[currentDesktop].master
        LAYOUTS[currentDesktop].master = LAYOUTS[currentDesktop].stacked.shift()
      else
        LAYOUTS[currentDesktop].stacked = LAYOUTS[currentDesktop].stacked.filter (x) -> x isnt id
      chrome.windows.update LAYOUTS[currentDesktop].master, {
        focused: true
      }
      LAYOUTS[currentDesktop].update()

      # Push to another layout
      LAYOUTS[Number(command[8])].stacked.push window.id

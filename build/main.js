(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.stats = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var LAYOUTS, MonocleLayout, RightStackLayout, currentDesktop, validateList;

chrome.management.getAll(function(apps) {
  var app, j, len, terminalId, terminalURL;
  terminalId = null;
  for (j = 0, len = apps.length; j < len; j++) {
    app = apps[j];
    if (app.name === 'Secure Shell') {
      terminalId = app.id;
    }
  }
  terminalURL = 'chrome-extension://' + terminalId + '/html/crosh.html';
  return chrome.commands.onCommand.addListener(function(command) {
    var childWindow;
    if (command === 'open-terminal') {
      childWindow = window.open(terminalURL, '_blank', 'titlebar=no,toolbar=no');
      return childWindow.document.getElementById('terminal').focus();

      /*
      chrome.windows.create {
        url: 'chrome-extension://' + terminalId + '/html/crosh.html'
        type: 'popup'
        focused: true
      }, ->
         * Allow the user to type immediately
        chrome.tabs.executeScript
          code: 'document.getElementById("terminal").focus();'
       */
    }
  });
});

MonocleLayout = (function() {
  function MonocleLayout(master1, stacked1) {
    this.master = master1;
    this.stacked = stacked1;
  }

  MonocleLayout.prototype.hide = function() {
    var j, len, ref, results, stacked;
    if (this.master != null) {
      chrome.windows.update(this.master, {
        state: 'minimized'
      });
    }
    ref = this.stacked;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      stacked = ref[j];
      results.push(chrome.windows.update(stacked, {
        state: 'minimized'
      }));
    }
    return results;
  };

  MonocleLayout.prototype.validate = function(cb) {
    return validateList(this.stacked, (function(_this) {
      return function(stacked, changed) {
        _this.stacked = stacked;
        return cb(changed);
      };
    })(this));
  };

  MonocleLayout.prototype.update = function() {
    var j, len, ref, stacked;
    console.log('updating monocle layout');
    if (this.master != null) {
      chrome.windows.update(this.master, {
        left: 0,
        top: 0,
        width: screen.width,
        height: screen.height,
        state: 'normal'
      });
    }
    ref = this.stacked;
    for (j = 0, len = ref.length; j < len; j++) {
      stacked = ref[j];
      chrome.windows.update(stacked, {
        left: 0,
        top: 0,
        width: screen.width,
        height: screen.height,
        state: 'normal'
      });
    }
    return this.validate(function(changed) {
      if (changed) {
        return this.update();
      }
    });
  };

  return MonocleLayout;

})();

validateList = function(list, cb, i, filtered, changed) {
  if (i == null) {
    i = 0;
  }
  if (filtered == null) {
    filtered = [];
  }
  if (changed == null) {
    changed = false;
  }
  if (i === list.length) {
    return cb(filtered, changed);
  } else {
    return chrome.windows.get(list[i], {
      populate: false
    }, function(window) {
      if (window != null) {
        filtered.push(list[i]);
      } else {
        changed = true;
      }
      return validateList(list, cb, i + 1, filtered, changed);
    });
  }
};

RightStackLayout = (function() {
  function RightStackLayout(master1, stacked1) {
    this.master = master1;
    this.stacked = stacked1;
  }

  RightStackLayout.prototype.hide = function() {
    var j, len, ref, results, stacked;
    if (this.master != null) {
      chrome.windows.update(this.master, {
        state: 'minimized'
      });
    }
    ref = this.stacked;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      stacked = ref[j];
      results.push(chrome.windows.update(stacked, {
        state: 'minimized'
      }));
    }
    return results;
  };

  RightStackLayout.prototype.validate = function(cb) {
    return validateList(this.stacked, (function(_this) {
      return function(stacked, changed) {
        _this.stacked = stacked;
        return cb(changed);
      };
    })(this));
  };

  RightStackLayout.prototype.update = function() {
    var i, j, len, ref, stacked;
    if (this.stacked.length > 0) {
      chrome.windows.update(this.master, {
        left: 0,
        top: 0,
        width: Math.round(screen.width / 2),
        height: screen.height,
        state: 'normal'
      });
      ref = this.stacked;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        stacked = ref[i];
        chrome.windows.update(stacked, {
          left: Math.round(screen.width / 2),
          top: Math.round((i / this.stacked.length) * screen.height),
          width: Math.round(screen.width / 2),
          height: Math.round(screen.height / this.stacked.length),
          state: 'normal'
        });
      }
    } else if (this.master != null) {
      chrome.windows.update(this.master, {
        left: 0,
        top: 0,
        width: screen.width,
        height: screen.height
      });
    }
    return this.validate(function(changed) {
      if (changed) {
        return this.update();
      }
    });
  };

  return RightStackLayout;

})();

LAYOUTS = (function() {
  var j, results;
  results = [];
  for (j = 0; j <= 9; j++) {
    results.push(new RightStackLayout(null, []));
  }
  return results;
})();

currentDesktop = 1;

chrome.windows.getAll({
  populate: false
}, function(windows) {
  var j, len, master, stacked, window;
  master = null;
  stacked = [];
  for (j = 0, len = windows.length; j < len; j++) {
    window = windows[j];
    if (window.focused) {
      master = window.id;
    } else {
      stacked.push(window.id);
    }
  }
  LAYOUTS[currentDesktop].master = master;
  LAYOUTS[currentDesktop].stacked = stacked;
  chrome.windows.onCreated.addListener(function(window) {
    if (LAYOUTS[currentDesktop].master != null) {
      LAYOUTS[currentDesktop].stacked.unshift(LAYOUTS[currentDesktop].master);
    }
    LAYOUTS[currentDesktop].master = window.id;
    return LAYOUTS[currentDesktop].update();
  });
  return chrome.windows.onRemoved.addListener(function(id) {
    if (id === LAYOUTS[currentDesktop].master) {
      LAYOUTS[currentDesktop].master = LAYOUTS[currentDesktop].stacked.shift();
    } else {
      LAYOUTS[currentDesktop].stacked = LAYOUTS[currentDesktop].stacked.filter(function(x) {
        return x !== id;
      });
    }
    chrome.windows.update(LAYOUTS[currentDesktop].master, {
      focused: true
    });
    return LAYOUTS[currentDesktop].update();
  });
});

chrome.commands.onCommand.addListener(function(command) {
  console.log('got', command);
  if (command === 'make-master') {
    return chrome.windows.getLastFocused({
      populate: false
    }, function(window) {
      if (window.id !== LAYOUTS[currentDesktop].master) {
        LAYOUTS[currentDesktop].stacked = LAYOUTS[currentDesktop].stacked.filter(function(x) {
          return x !== window.id;
        });
        LAYOUTS[currentDesktop].stacked.unshift(LAYOUTS[currentDesktop].master);
        LAYOUTS[currentDesktop].master = window.id;
        return LAYOUTS[currentDesktop].update();
      }
    });
  } else if (command === 'rotate-window') {
    return chrome.windows.getLastFocused({
      populate: false
    }, function(window) {
      var index;
      if ((window != null) && (LAYOUTS[currentDesktop].master != null)) {
        if (window.id === LAYOUTS[currentDesktop].master && LAYOUTS[currentDesktop].stacked.length > 0) {
          return chrome.windows.update(LAYOUTS[currentDesktop].stacked[0], {
            focused: true
          });
        } else {
          index = LAYOUTS[currentDesktop].stacked.indexOf(window.id);
          if (index === LAYOUTS[currentDesktop].stacked.length - 1) {
            return chrome.windows.update(LAYOUTS[currentDesktop].master, {
              focused: true
            });
          } else {
            return chrome.windows.update(LAYOUTS[currentDesktop].stacked[index + 1], {
              focused: true
            });
          }
        }
      }
    });
  } else if (command === 'close-window') {
    return chrome.windows.getLastFocused({
      populate: false
    }, function(window) {
      return chrome.windows.remove(window.id);
    });
  } else if (command === 'switch-layout') {
    if (LAYOUTS[currentDesktop] instanceof RightStackLayout) {
      console.log('switching to monocle');
      LAYOUTS[currentDesktop] = new MonocleLayout(LAYOUTS[currentDesktop].master, LAYOUTS[currentDesktop].stacked);
      return LAYOUTS[currentDesktop].update();
    } else if (LAYOUTS[currentDesktop] instanceof MonocleLayout) {
      console.log('switching to right-stack');
      LAYOUTS[currentDesktop] = new RightStackLayout(LAYOUTS[currentDesktop].master, LAYOUTS[currentDesktop].stacked);
      return LAYOUTS[currentDesktop].update();
    }
  } else if (command === 'open-chrome') {
    return chrome.windows.create();
  } else if (command.match(/desktop-\d/) != null) {
    LAYOUTS[currentDesktop].hide();
    currentDesktop = Number(command[8]);
    console.log('on desktop', currentDesktop);
    return LAYOUTS[currentDesktop].validate(function() {
      LAYOUTS[currentDesktop].update();
      return chrome.windows.update(LAYOUTS[currentDesktop].master, {
        focused: true
      });
    });
  } else if (command.match(/send-\d/) != null) {
    console.log('send to desktop', Number(command[8]));
    return chrome.windows.getLastFocused({
      populate: false
    }, function(window) {
      var id;
      id = window.id;
      if (id === LAYOUTS[currentDesktop].master) {
        LAYOUTS[currentDesktop].master = LAYOUTS[currentDesktop].stacked.shift();
      } else {
        LAYOUTS[currentDesktop].stacked = LAYOUTS[currentDesktop].stacked.filter(function(x) {
          return x !== id;
        });
      }
      chrome.windows.update(LAYOUTS[currentDesktop].master, {
        focused: true
      });
      LAYOUTS[currentDesktop].update();
      return LAYOUTS[Number(command[8])].stacked.push(window.id);
    });
  }
});


},{}]},{},[1])(1)
});

//# sourceMappingURL=main.js.map

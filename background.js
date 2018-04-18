
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';


var settings = {};
let changed = {};
function applySettingChanges(target, changes) {
  for (let key of Object.keys(changes)) {
    if (Object.keys(changes[key]).includes('newValue')) {
      target[key] = changes[key].newValue;
    } else {
      delete target[key];
    }
  }
}
browser.storage.onChanged.addListener((changes, areaName) => {
  if (changed) {
    applySettingChanges(changed, changes);
  }
  applySettingChanges(settings, changes);
});
browser.storage.local.get(null).then((value) => {
  let changedKeys = Object.keys(changed);
  for (let key of Object.keys(value)) {
    if (!changedKeys.includes(key)) {
      settings[key] = value[key];
    }
  }
  changed = null;
});

async function registerToTST() {
  try {
    await browser.runtime.sendMessage(kTST_ID, {
      type: 'register-self',
      name: browser.runtime.getManifest().name,
      listeningTypes: ['tab-mousedown', 'tab-mouseup', 'tab-dragready'],
    });
  } catch (error) { return false; }
  return true;
}

var lastResolve = null;
function resolveAs(value) {
  if (lastResolve && typeof lastResolve === 'function') {
    lastResolve(value);
  }
  lastResolve = null;
}

var lastMessage;
browser.runtime.onMessageExternal.addListener((aMessage, aSender) => {
  if (aSender.id !== kTST_ID) {
    return;
  }
  switch (aMessage.type) {
    case 'ready': {
      registerToTST(); // passive registration for secondary (or after) startup
      return Promise.resolve(true);
    } break;
    case 'tab-mousedown': {
      if (aMessage.button !== 0) {
        break;
      }
      if (settings.preventOnlyForUnloadedTabs && !aMessage.tab.discarded) {
        resolveAs(true);
        break;
      }
      return new Promise((resolve, reject) => {
        resolveAs(true);
        lastResolve = resolve;
        lastMessage = aMessage;
      });
    } break;
    case 'tab-mouseup': {
      if (aMessage.button !== 0) {
        break;
      }
      let releasedWithoutMove = lastMessage && aMessage.tab.id === lastMessage.tab.id;
      resolveAs(!releasedWithoutMove);
    } break;
    case 'tab-dragready': {
      if (settings.preventOnlyForUnloadedTabs && !aMessage.tab.discarded) {
        resolveAs(true);
        break;
      }
      resolveAs(!settings.allowLongPressedTabs);
    } break;
  }
  return Promise.resolve(false);
});
registerToTST(); // aggressive registration on initial installation
let PIXI_OBJECT_UID = 0;
class PixiObject extends QmlWeb.QObject {
  constructor(meta) {
    super(meta.parent);
    QmlWeb.initQmlType(this, meta);
    this.$isComponentRoot = meta.isComponentRoot;
    this.$context = meta.context;
    this.$uid = PIXI_OBJECT_UID++;

    // store parent-item
    QmlWeb.createProperties(this, {
      parent: "Item",
      childrens: "list"
    });

    QmlWeb.AnchorsLayoutHandles.init(this);

    // childrenRect property
    this.childrenRect = new QmlWeb.QObject(this);
    QmlWeb.createProperties(this.childrenRect, {
      x: "real", // TODO ro
      y: "real", // TODO ro
      width: "real", // TODO ro
      height: "real" // TODO ro
    });
  }
  $updateChildrenRect(component) {
    if (!component || !component.children || component.children.length === 0) {
      return;
    }
    const children = component.children;

    let maxWidth = 0;
    let maxHeight = 0;
    let minX = children.length > 0 ? children[0].x : 0;
    let minY = children.length > 0 ? children[0].y : 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      maxWidth = Math.max(maxWidth, child.x + child.width);
      maxHeight = Math.max(maxHeight, child.y + child.heighth);
      minX = Math.min(minX, child.x);
      minY = Math.min(minX, child.y);
    }

    component.childrenRect.x = minX;
    component.childrenRect.y = minY;
    component.childrenRect.width = maxWidth;
    component.childrenRect.height = maxHeight;
  }
  setBinding(key, code) {
    let keys;
    if (typeof key === "string") {
      keys = key.split(".");
    } else if (key instanceof Array) {
      keys = key;
    } else {
      return;
    }

    let ctx = this;
    keys.forEach((_key, i) => {
      if (i < keys.length - 1) {
        ctx = ctx[_key];
      } else {
        ctx.$properties[_key].set(new QmlWeb.QMLBinding(code),
          QmlWeb.QMLProperty.ReasonUser, this, this.$context);
      }
    });
  }
  getRenderer() {
    let renderer = this;
    while (renderer) {
      if (renderer instanceof QmlWeb.Renderer) {
        renderer = renderer.renderer;
        break;
      }
      renderer = renderer.parent;
    }
    return renderer;
  }
}
QmlWeb.PixiObject = PixiObject;
const PIXI_MODULE_NAME = "PIXI";
(function() {
  const modules = QmlWeb.modules;
  const pixi_modules = modules[PIXI_MODULE_NAME] = [];
  // Helper. Register a type to a module
  function registerPixiType(options, constructor) {
    if (constructor !== undefined) {
      options.constructor = constructor;
    }
    if (!options.versions) {
      options.versions = /.*/;
    }

    const descriptor = options;

    descriptor.constructor.$qmlTypeInfo = {
      enums: descriptor.enums,
      signals: descriptor.signals,
      defaultProperty: "childrens",
      properties: descriptor.properties
    };

    if (descriptor.global) {
      QmlWeb.registerGlobalQmlType(descriptor.name, descriptor.constructor);
    }

    const moduleDescriptor = {
      name: descriptor.name,
      versions: descriptor.versions,
      constructor: descriptor.constructor
    };

    pixi_modules.push(moduleDescriptor);
  }
  QmlWeb.registerPixiType = registerPixiType;
}());

// QmlWeb.setupGetter(
//   PixiObject.prototype,
//   "Component",
//   QMLComponent.getAttachedObject
// );

function delayInitProperty(obj, key, init_handle) {
  QmlWeb.setupGetter(obj, key, () => {
    const val = init_handle(obj, key);
    delete obj[key];
    obj[key] = val;
    return val;
  });
}
QmlWeb.delayInitProperty = delayInitProperty;

QmlWeb.registerQmlType({
  module: PIXI_MODULE_NAME,
  global: true,
  name: "Item",
  versions: /.*/
}, PixiObject);

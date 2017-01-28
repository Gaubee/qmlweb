let PIXI_OBJECT_UID = 0;
/* Anchors-Layout system principle 
                                                   +---------------+  +--------+
          +---------------------------------------->     THIS      |  | +----+ |
          |                                        |   read only   |  | |USER| |
   3.     |             +--------------------------+---------------+  | +----+ |
 Notifies the           |                                             +--------+
  read-only attribute   |                                                 |
 that the real value    |                                                 |
  has changed.          |                                                 |
          |             |                                                 |
          |             |      4.                                         |
          |      Read the real data                   1. Set Anchors properties.
          |       and redraw the layout                                   |
          |             |                                                 |
          |             |                                                 |
          |             |                                                 |
          |             |                                                 |
         +--------------v--------+                                    +---v----------------------+
         |  THIS.EFFECT_ANCHORS  |   2.Calculates layout results      |       THIS.ANCHORS       |
         | for store real value. <---and-writes to effect_anchors-----+ The default is undefined.|
         |                       |                                    | for setter.              |
         +-----------------------+                                    +--------------------------+
*/
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

    // FOR setter
    const anchors_property = {
      left: "AnchorLine",
      right: "AnchorLine",
      top: "AnchorLine",
      bottom: "AnchorLine",
      horizontalCenter: "AnchorLine",
      verticalCenter: "AnchorLine",
      fill: "Item",
      centerIn: "Item",
      margins: "real",
      leftMargin: "real",
      rightMargin: "real",
      topMargin: "real",
      bottomMargin: "real",
    };
    const anchors_property_keys = Object.keys(anchors_property);
    const anchors = this.anchors = new QmlWeb.QObject(this);
    QmlWeb.createProperties(anchors, anchors_property);
    anchors.leftChanged.connect(this, this.$updateHGeometry);
    anchors.rightChanged.connect(this, this.$updateHGeometry);
    anchors.topChanged.connect(this, this.$updateVGeometry);
    anchors.bottomChanged.connect(this, this.$updateVGeometry);
    anchors.horizontalCenterChanged.connect(this, this.$updateHGeometry);
    anchors.verticalCenterChanged.connect(this, this.$updateVGeometry);
    anchors.fillChanged.connect(this, this.$updateHVGeometry);
    anchors.centerInChanged.connect(this, this.$updateHVGeometry);
    anchors.leftMarginChanged.connect(this, this.$updateHGeometry);
    anchors.rightMarginChanged.connect(this, this.$updateHGeometry);
    anchors.topMarginChanged.connect(this, this.$updateVGeometry);
    anchors.bottomMarginChanged.connect(this, this.$updateVGeometry);
    anchors.marginsChanged.connect(this, this.$updateHVGeometry);

    const self = this;
    const effect_anchors = this.effect_anchors = {
      set width(v) {
        self.width = v
      },
      get width() {
        return self.width
      },
      set height(v) {
        self.height = v
      },
      get height() {
        return self.height
      },
    };

    // FOR store real value
    const effect_anchors_binds = {};
    anchors_property_keys.forEach(function(key) {
      if (/AnchorLine|real/.test(anchors_property[key])) {
        effect_anchors[key] = 0;
        const binds = effect_anchors_binds[key] = [key];
        var _val = 0;
        let getter = () => _val;
        if (key.indexOf("Margin") !== -1) {
          getter = () => anchors[key] === undefined ? effect_anchors.margins : _val
        }
        if (key === "margins") {
          binds.push("leftMargin", "rightMargin", "topMargin", "bottomMargin")
        }
        QmlWeb.setupGetterSetter(effect_anchors, key, getter, (newVal) => {
          var oldVal = _val;
          if (newVal !== oldVal) {
            _val = newVal;
            // anchors.$properties[key].changed(newVal, oldVal, key);
            for (var i = 0, bind_key; bind_key = binds[i]; i++) {
              self.$properties[bind_key].changed(newVal, oldVal, key);
            }
          }
        })
      }
    });

    QmlWeb.createProperties(this, {
      width: "real",
      height: "real"
    });

    // FOR getter
    const readOnlySetter = function() {
      throw new TypeError(`Cannot assign to read-only property "${this.name}"`);
    };

    anchors_property_keys.forEach(key => {
      if (anchors_property[key] !== "AnchorLine") {
        return
      }
      let getter = () => {
        return effect_anchors[key]
      };
      let anchorsBindKeys = [];
      let selfBindKeys = [];
      switch (key) {
        case "horizontalCenter":
          getter = () => {
            return effect_anchors.left + this.width / 2
          }
          anchorsBindKeys.push("left");
          selfBindKeys.push("width");
          break;
        case "verticalCenter":
          getter = () => {
            return effect_anchors.top + this.height / 2
          }
          anchorsBindKeys.push("top");
          selfBindKeys.push("height");
          break;
        case "left":
          getter = () => {
            return effect_anchors.left + effect_anchors.leftMargin
          }
          anchorsBindKeys.push("left", "leftMargin");
          break;
        case "right":
          getter = () => {
            return effect_anchors.left + this.width + effect_anchors.rightMargin
          }
          anchorsBindKeys.push("left", "rightMargin");
          selfBindKeys.push("width");
          break;
        case "top":
          getter = () => {
            return effect_anchors.top + effect_anchors.topMargin
          }
          anchorsBindKeys.push("top", "topMargin");
          break;
        case "bottom":
          getter = () => {
            return effect_anchors.top + this.height + effect_anchors.bottomMargin
          }
          anchorsBindKeys.push("top", "bottomMargin");
          selfBindKeys.push("height");
          break;
        default:
          anchorsBindKeys.push(key);
      }
      QmlWeb.createProperty("AnchorLine", this, key, {
        getter: getter,
        setter: readOnlySetter
      });
      anchorsBindKeys.forEach(bind_key => {
        effect_anchors_binds[bind_key].push(key);
      });
      selfBindKeys.forEach(bind_key => {
        const locks = {};
        this[`${bind_key}Changed`].connect((newVal, oldVal, name) => {
          if (locks[name]) {
            return
          }
          locks[name] = true;
          // console.log(`Changed Self from ${name}:`, newVal, oldVal, `for ${key}`, this.$uid);
          this.$properties[key].changed(newVal, oldVal, name)
          locks[name] = false;
        });
      });
    });

    QmlWeb.createProperty("AnchorLine", this, "x", {
      getter: () => this.effect_anchors.left,
      setter: (newVal) => this.effect_anchors.left = newVal
    });
    QmlWeb.createProperty("AnchorLine", this, "y", {
      getter: () => this.effect_anchors.top,
      setter: (newVal) => this.effect_anchors.top = newVal
    });
    this.xChanged.connect(this, this.left.changed);
    this.yChanged.connect(this, this.top.changed);

    // console.log(this.$properties["width"].changed)
    // anchors.widthChanged.connect(this, this.width.changed.bind(this.width));
    // anchors.heightChanged.connect(this, this.height.changed.bind(this.height));
    // anchors.leftChanged.connect(this, this.left.changed.bind(this.left));
    // anchors.rightChanged.connect(this, this.right.changed.bind(this.right));
    // anchors.topChanged.connect(this, this.top.changed.bind(this.top));
    // anchors.bottomChanged.connect(this, this.bottom.changed.bind(this.bottom));

    // childrenRect property
    this.childrenRect = new QmlWeb.QObject(this);
    QmlWeb.createProperties(this.childrenRect, {
      x: "real", // TODO ro
      y: "real", // TODO ro
      width: "real", // TODO ro
      height: "real" // TODO ro
    });
  }
  $updateHGeometry(newVal, oldVal, propName, update_object, prevent_update) {
    const anchors = this.anchors || this;
    if (this.$updatingHGeometry) {
      return;
    }
    this.$updatingHGeometry = true;

    const flags = QmlWeb.Signal.UniqueConnection;
    const lM = anchors.leftMargin || anchors.margins;
    const rM = anchors.rightMargin || anchors.margins;
    const w = this.width;
    const left = this.parent ? this.parent.left : 0;

    // Width
    if (propName === "width") {
      this.$isUsingImplicitWidth = false;
    }

    // Position TODO: Layouts

    const u = update_object || {}; // our update object
    if (anchors.fill !== undefined) {
      const fill = anchors.fill;
      const props = fill.$properties;
      props.left.changed.connect(this, this.$updateHGeometry, flags);
      props.right.changed.connect(this, this.$updateHGeometry, flags);
      props.width.changed.connect(this, this.$updateHGeometry, flags);

      this.$isUsingImplicitWidth = false;
      u.width = fill.width - lM - rM;
      u.x = fill.left - left + lM;
      u.left = fill.left + lM;
      u.right = fill.right - rM;
      u.horizontalCenter = (u.left + u.right) / 2;
    } else if (anchors.centerIn !== undefined) {
      anchors.centerIn.$properties.horizontalCenter.changed.connect(this, (nV, oV, n) => {
        this.$updateHGeometry(nV, oV, n);
      }, flags);

      u.horizontalCenter = anchors.centerIn.horizontalCenter;
      u.x = u.horizontalCenter - w / 2 - left;
      u.left = u.horizontalCenter - w / 2;
      u.right = u.horizontalCenter + w / 2;
    } else if (anchors.left !== undefined) {
      u.left = anchors.left + lM;
      if (anchors.right !== undefined) {
        u.right = anchors.right - rM;
        this.$isUsingImplicitWidth = false;
        u.width = u.right - u.left;
        u.x = u.left - left;
        u.horizontalCenter = (u.right + u.left) / 2;
      } else if (anchors.horizontalCenter !== undefined) {
        u.horizontalCenter = anchors.horizontalCenter;
        this.$isUsingImplicitWidth = false;
        u.width = (u.horizontalCenter - u.left) * 2;
        u.x = u.left - left;
        u.right = 2 * u.horizontalCenter - u.left;
      } else {
        u.x = u.left - left;
        u.right = u.left + w;
        u.horizontalCenter = u.left + w / 2;
      }
    } else if (anchors.right !== undefined) {
      u.right = anchors.right - rM;
      if (anchors.horizontalCenter !== undefined) {
        u.horizontalCenter = anchors.horizontalCenter;
        this.$isUsingImplicitWidth = false;
        u.width = (u.right - u.horizontalCenter) * 2;
        u.x = 2 * u.horizontalCenter - u.right - left;
        u.left = 2 * u.horizontalCenter - u.right;
      } else {
        u.x = u.right - w - left;
        u.left = u.right - w;
        u.horizontalCenter = u.right - w / 2;
      }
    } else if (anchors.horizontalCenter !== undefined) {
      u.horizontalCenter = anchors.horizontalCenter;
      u.x = u.horizontalCenter - w / 2 - left;
      u.left = u.horizontalCenter - w / 2;
      u.right = u.horizontalCenter + w / 2;
    } else {
      if (this.parent) {
        const leftProp = this.parent.$properties.left;
        leftProp.changed.connect(this, this.$updateHGeometry, flags);
      }

      u.left = this.x + left;
      u.right = u.left + w;
      u.horizontalCenter = u.left + w / 2;
    }

    this.$updatingHGeometry = false;

    if (!prevent_update) {
      for (const key in u) {
        // this.anchors[key] = u[key];
        this.effect_anchors[key] = u[key];
      }

      if (this.parent) this.$updateChildrenRect(this.parent);
    }
  }
  $updateVGeometry(newVal, oldVal, propName, update_object, prevent_update) {
    const anchors = this.anchors || this;
    if (this.$updatingVGeometry) {
      return;
    }
    this.$updatingVGeometry = true;

    const flags = QmlWeb.Signal.UniqueConnection;
    const tM = anchors.topMargin || anchors.margins;
    const bM = anchors.bottomMargin || anchors.margins;
    const h = this.height;
    const top = this.parent ? this.parent.top : 0;

    // HeighttopProp
    if (propName === "height") {
      this.$isUsingImplicitHeight = false;
    }

    // Position TODO: Layouts

    const u = update_object || {}; // our update object

    if (anchors.fill !== undefined) {
      const fill = anchors.fill;
      const props = fill.$properties;
      props.top.changed.connect(this, this.$updateVGeometry, flags);
      props.bottom.changed.connect(this, this.$updateVGeometry, flags);
      props.height.changed.connect(this, this.$updateVGeometry, flags);

      this.$isUsingImplicitHeight = false;
      u.height = fill.height - tM - bM;
      u.y = fill.top - top + tM;
      u.top = fill.top + tM;
      u.bottom = fill.bottom - bM;
      u.verticalCenter = (u.top + u.bottom) / 2;
    } else if (anchors.centerIn !== undefined) {
      anchors.centerIn.$properties.verticalCenter.changed.connect(this, this.$updateVGeometry, flags);

      u.verticalCenter = anchors.centerIn.verticalCenter;
      u.y = u.verticalCenter - h / 2 - top;
      u.top = u.verticalCenter - h / 2;
      u.bottom = u.verticalCenter + h / 2;
    } else if (anchors.top !== undefined) {
      u.top = anchors.top + tM;
      if (anchors.bottom !== undefined) {
        u.bottom = anchors.bottom - bM;
        this.$isUsingImplicitHeight = false;
        u.height = u.bottom - u.top;
        u.y = u.top - top;
        u.verticalCenter = (u.bottom + u.top) / 2;
      } else if ((u.verticalCenter = anchors.verticalCenter) !== undefined) {
        this.$isUsingImplicitHeight = false;
        u.height = (u.verticalCenter - u.top) * 2;
        u.y = u.top - top;
        u.bottom = 2 * u.verticalCenter - u.top;
      } else {
        u.y = u.top - top;
        u.bottom = u.top + h;
        u.verticalCenter = u.top + h / 2;
      }
    } else if (anchors.bottom !== undefined) {
      u.bottom = anchors.bottom - bM;
      if ((u.verticalCenter = anchors.verticalCenter) !== undefined) {
        this.$isUsingImplicitHeight = false;
        u.height = (u.bottom - u.verticalCenter) * 2;
        u.y = 2 * u.verticalCenter - u.bottom - top;
        u.top = 2 * u.verticalCenter - u.bottom;
      } else {
        u.y = u.bottom - h - top;
        u.top = u.bottom - h;
        u.verticalCenter = u.bottom - h / 2;
      }
    } else if (anchors.verticalCenter !== undefined) {
      u.verticalCenter = anchors.verticalCenter;
      u.y = u.verticalCenter - h / 2 - top;
      u.top = u.verticalCenter - h / 2;
      u.bottom = u.verticalCenter + h / 2;
    } else {
      if (this.parent) {
        const topProp = this.parent.$properties.top;
        topProp.changed.connect(this, this.$updateVGeometry, flags);
      }

      u.top = this.y + top;
      u.bottom = u.top + h;
      u.verticalCenter = u.top + h / 2;
    }

    this.$updatingVGeometry = false;

    if (!prevent_update) {
      for (const key in u) {
        // this.anchors[key] = u[key];
        this.effect_anchors[key] = u[key];
      }

      if (this.parent) this.$updateChildrenRect(this.parent);
    }
  }
  $updateHVGeometry(newVal, oldVal, propName) {
    const u = {};
    this.$updateHGeometry(newVal, oldVal, propName, u, true);
    this.$updateVGeometry(newVal, oldVal, propName, u, false);
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
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
+-----------------------v                              +------------------v----+
|  THIS.EFFECT_ANCHORS  | 2.Calculates layout results  |       THIS.ANCHORS    |
| for store real value. <-and writes to effect_anchors-+ The default is        |
|                       |                              | undefined. for setter.|
+-----------------------+                              +-----------------------+
*/

// FOR getter
const readOnlySetter = function() {
  throw new TypeError(`Cannot assign to read-only property "${this.name}"`); // eslint-disable-line no-invalid-this, max-len
};
QmlWeb.AnchorsLayoutHandles = (() => {
  const exports = {};
  const effect_anchors_binds = {
    top: ["top", "y"],
    bottom: ["bottom"],
    left: ["left", "x"],
    right: ["right"],
    horizontalCenter: ["left", "width", "right"],
    verticalCenter: ["top", "width", "bottom"],
    margins: ["left", "right", "top", "bottom"],
    leftMargin: ["left"],
    rightMargin: ["width"],
    topMargin: ["top"],
    bottomMargin: ["height"],
  };
  exports.init = function(self) {
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
      // don't use real, for init as undefined
      margins: "var",
      leftMargin: "var",
      rightMargin: "var",
      topMargin: "var",
      bottomMargin: "var",
    };
    const anchors_property_keys = Object.keys(anchors_property);
    const anchors = self.anchors = new QmlWeb.QObject(self);
    QmlWeb.createProperties(anchors, anchors_property);
    anchors.leftChanged.connect(self, exports.left_right_Changed);
    anchors.rightChanged.connect(self, exports.left_right_Changed);
    anchors.topChanged.connect(self, exports.top_bottom_Changed);
    anchors.bottomChanged.connect(self, exports.top_bottom_Changed);
    anchors.horizontalCenterChanged.connect(self,
      exports.horizontalCenterChanged);
    anchors.verticalCenterChanged.connect(self, exports.verticalCenterChanged);
    anchors.fillChanged.connect(self, exports.fillChanged);
    anchors.centerInChanged.connect(self, exports.centerInChanged);
    anchors.leftMarginChanged.connect(self, exports.marginsChanged);
    anchors.rightMarginChanged.connect(self, exports.marginsChanged);
    anchors.topMarginChanged.connect(self, exports.marginsChanged);
    anchors.bottomMarginChanged.connect(self, exports.marginsChanged);
    anchors.marginsChanged.connect(self, exports.marginsChanged);

    QmlWeb.createProperties(self, {
      width: "real",
      height: "real",
      x: {
        type: "real",
        setter(newVal) {
          this.val = isFinite(newVal) ? +newVal : 0;
        }
      },
      y: {
        type: "real",
        setter(newVal) {
          this.val = isFinite(newVal) ? +newVal : 0;
        }
      }
    });

    const effect_anchors = self.effect_anchors = {};
    ["width", "height", "x", "y"].forEach((key) => {
      const prop = self.$properties[key];
      QmlWeb.setupGetterSetter(effect_anchors, key,
        () => prop.get(),
        (newVal) => prop.set(newVal, QmlWeb.QMLProperty.ReasonInner)
      );
      const source_setter = prop.setter;
      QmlWeb.setupGetterSetter(effect_anchors, `$${key}$setter`,
        () => prop.setter,
        (handle) => {
          prop.setter = handle || source_setter;
        });
      const source_getter = prop.getter;
      QmlWeb.setupGetterSetter(effect_anchors, `$${key}$getter`,
        () => prop.getter,
        (handle) => {
          prop.getter = handle || source_getter;
        });
    });

    // FOR store real value
    anchors_property_keys.forEach((key) => {
      if (/AnchorLine|var/.test(anchors_property[key])) {
        const binds = effect_anchors_binds[key];
        const VALUE_KEY = `$${key}$value`;
        const GETTER_KEY = `$${key}$getter`;
        const SETTER_KEY = `$${key}$setter`;
        effect_anchors[VALUE_KEY] = 0;
        let getter = () => {
          if (effect_anchors[GETTER_KEY]) {
            effect_anchors[VALUE_KEY] = effect_anchors[GETTER_KEY]();
          }
          return effect_anchors[VALUE_KEY];
        };
        if (key.indexOf("Margin") !== -1) {
          const base_getter = getter;
          getter = function() {
            return anchors[key] === undefined ?
              effect_anchors.margins :
              base_getter();
          };
        }

        QmlWeb.setupGetterSetter(effect_anchors, key, getter, (newVal) => {
          const oldVal = effect_anchors[VALUE_KEY];
          if (newVal !== oldVal) {
            if (effect_anchors[SETTER_KEY]) {
              effect_anchors[SETTER_KEY](newVal);
            } else {
              effect_anchors[VALUE_KEY] = newVal;
            }
            // anchors.$properties[key].changed(newVal, oldVal, key);
            for (let i = 0, bind_key, len = binds.length; i < len; i++) {
              bind_key = binds[i];
              const bindProp = self.$properties[bind_key];
              bindProp.changed(newVal, oldVal, key);
            }
          }
        });
        let _getter_getter_value;
        QmlWeb.setupGetterSetter(effect_anchors, GETTER_KEY,
          () => _getter_getter_value,
          (v) => {
            _getter_getter_value = v;
          });
      }
    });

    anchors_property_keys.forEach(key => {
      if (anchors_property[key] !== "AnchorLine") {
        return;
      }
      let getter = () => effect_anchors[key];
      const selfBindKeys = [];
      switch (key) {
        case "horizontalCenter":
          getter = () => self.left + self.width / 2;
          selfBindKeys.push("width");
          break;
        case "verticalCenter":
          getter = () => self.top + self.height / 2;
          selfBindKeys.push("height");
          break;
        case "left":
          getter = () => (self.parent ? self.parent.left : 0) +
            effect_anchors.x + effect_anchors.leftMargin;
          break;
        case "right":
          getter = () => self.left + self.width + effect_anchors.rightMargin;
          selfBindKeys.push("width");
          break;
        case "top":
          getter = () => (self.parent ? self.parent.top : 0) +
            effect_anchors.y + effect_anchors.topMargin;
          break;
        case "bottom":
          getter = () => self.top + self.height + effect_anchors.bottomMargin;
          selfBindKeys.push("height");
          break;
        default:
      }
      QmlWeb.createProperty("AnchorLine", self, key, {
        getter,
        setter: readOnlySetter
      });
      selfBindKeys.forEach(bind_key => {
        const locks = {};
        self[`${bind_key}Changed`].connect((newVal, oldVal, name) => {
          if (locks[name]) {
            return;
          }
          locks[name] = true;
          self.$properties[key].changed(newVal, oldVal, name);
          locks[name] = false;
        });
      });
    });

    self.$updateAnchorsGetter = exports.$updateAnchorsGetter;
  };

  function unBindOldValue(self, oldItem, BindKeyList) {
    const props = self.$properties;
    if (oldItem instanceof QmlWeb.PixiObject) { // Unbind the properties
      const oldProps = oldItem.$properties;
      BindKeyList.forEach((bind_info) => {
        const bind_key = bind_info[0];
        const fellow_keys = bind_info[1] || bind_info;
        const bindChanged = oldProps[bind_key].changed;
        fellow_keys.forEach(fellow_key =>
          bindChanged.disconnect(props[fellow_key].changed));
      });
    }
  }

  function bindNewValue(self, newItem, BindKeyList) {
    const props = self.$properties;
    const flags = QmlWeb.Signal.UniqueConnection;
    const newProps = newItem.$properties;
    BindKeyList.forEach((bind_info) => {
      const bind_key = bind_info[0];
      const fellow_keys = bind_info[1] || bind_info;
      const bindChanged = newProps[bind_key].changed;
      fellow_keys.forEach(fellow_key =>
        bindChanged.connect(self, props[fellow_key].changed, flags));
    });
  }

  const FILL_BIND_PROPS = [
    ["left"],
    ["x"],
    ["width"],
    ["top"],
    ["y"],
    ["height"],
  ];
  exports.fillChanged = function(newVal, oldVal) {
    const effect_anchors = this.effect_anchors;
    const lM = () => effect_anchors.leftMargin;
    const rM = () => effect_anchors.rightMargin;
    const tM = () => effect_anchors.topMargin;
    const bM = () => effect_anchors.bottomMargin;
    const parent = this.parent;
    let p_left;
    let p_top;
    if (parent) {
      p_left = () => parent.left;
      p_top = () => parent.top;
    } else {
      p_left = p_top = () => 0;
    }

    unBindOldValue(this, oldVal, FILL_BIND_PROPS);

    const u = {};
    if (newVal instanceof QmlWeb.PixiObject) {
      const fill = newVal;

      u.width = () => fill.width - lM() - rM();
      u.x = () => fill.left - p_left();

      u.height = () => fill.height - tM() - bM();
      u.y = () => fill.top - p_top();

      bindNewValue(this, newVal, FILL_BIND_PROPS);
    } else {
      [
        "width",
        "x",
        "height",
        "y",
      ].forEach(key => {
        u[key] = null;
      });
    }
    this.$updateAnchorsGetter(u);
  };

  const CENTERIN_BIND_PROPS = [
    ["horizontalCenter", ["left", "x"]],
    ["verticalCenter", ["height", "y"]],
  ];
  exports.centerInChanged = function(newVal, oldVal) {
    const anchors = this.anchors || this;
    if (anchors.fill) {
      return;
    }
    const parent = this.parent;
    let p_left;
    let p_top;
    if (parent) {
      p_left = () => parent.left;
      p_top = () => parent.top;
    } else {
      p_left = p_top = () => 0;
    }

    unBindOldValue(this, oldVal, CENTERIN_BIND_PROPS);

    const u = {};
    if (newVal instanceof QmlWeb.PixiObject) {
      const newCenterIn = newVal;
      u.x = () => newCenterIn.horizontalCenter - this.width / 2 - p_left();
      u.y = () => newCenterIn.verticalCenter - this.height / 2 - p_top();

      bindNewValue(this, newCenterIn, CENTERIN_BIND_PROPS);
    } else {
      [
        "x",
        "y",
      ].forEach(key => {
        u[key] = null;
      });
    }
    this.$updateAnchorsGetter(u);
  };

  exports.left_right_Changed = function(newVal, oldVal, name) {
    const anchors = this.anchors || this;
    if (anchors.fill || anchors.centerIn) {
      return;
    }

    const parent = this.parent;
    let p_left;
    if (parent) {
      p_left = () => parent.left;
    } else {
      p_left = () => 0;
    }
    const u = {};
    const effect_anchors = this.effect_anchors;
    effect_anchors[name] = newVal;
    if (name === "left") {
      u.x = () => newVal - p_left();
    } else //right
    if (!anchors.$properties.left.binding) {
      u.x = () => newVal - this.width - p_left();
      if (!anchors._only_right_binding) {
        anchors._only_right_binding = (width) => {
          console.log("zzzz", width);
          this.xChanged(this.x, null, "x");
        };
        this.widthChanged.connect(this, anchors._only_right_binding);
      }
    } else if (anchors._only_right_binding) {
      this.widthChanged.disconnect(anchors._only_right_binding);
      anchors._only_right_binding = null;
    }
    // otherwise width force bind anchors and ignore old bind.
    // Lock/UnLock Width
    const LOCK_KEY = "LOCK_width_BY_left_AND_right";
    const is_lock_width = isFinite(anchors.left) && isFinite(anchors.right);
    if (is_lock_width) {
      if (!anchors[LOCK_KEY]) {
        anchors[LOCK_KEY] = true;
        u.width = () => effect_anchors.right -
          effect_anchors.left -
          effect_anchors.leftMargin -
          effect_anchors.rightMargin;
      }
    } else if (anchors[LOCK_KEY]) {
      anchors[LOCK_KEY] = false;
      u.width = null;
    }
    this.$updateAnchorsGetter(u);
    if (is_lock_width && name === "right") {
      this.$properties.width.changed(this.width, null, "width");
    }
  };

  const top_bottom_Changed_code = exports.left_right_Changed.toString()
    .replace(/left/gi, "top")
    .replace(/right/gi, "bottom")
    .replace(/width/gi, "height")
    .replace(/\.x/gi, ".y");

  exports.top_bottom_Changed = Function(`return ${top_bottom_Changed_code}`)(); // eslint-disable-line  no-new-func, max-len

  exports.horizontalCenterChanged = function() {
    const anchors = this.anchors || this;
    if (anchors.fill || anchors.centerIn) {
      return;
    }

    const effect_anchors = this.effect_anchors;
    const LOCK_KEY = "LOCK_horizontalCenter";
    if (effect_anchors[LOCK_KEY]) {
      this.leftChanged(this.left);
      this.xChanged(this.x);
    } else {
      const parent = this.parent;
      let p_left;
      if (parent) {
        p_left = () => parent.left;
      } else {
        p_left = () => 0;
      }
      effect_anchors[LOCK_KEY] = true;
      const u = {};
      u.x = () => anchors.horizontalCenter - this.width / 2 - p_left();

      this.$updateAnchorsGetter(u);
    }
  };
  const horizontalCenterChanged_code = exports.horizontalCenterChanged
    .toString()
    .replace(/left/gi, "top")
    .replace(/horizontalCenter/gi, "verticalCenter")
    .replace(/width/gi, "height")
    .replace(/\.x/gi, ".y");
  exports.verticalCenterChanged = Function(`return ${horizontalCenterChanged_code}`)(); // eslint-disable-line  no-new-func, max-len

  exports.marginsChanged = function(newVal, oldVal, name) {
    const effect_anchors = this.effect_anchors;
    effect_anchors[name] = newVal;
  };

  const anchors_lock_setter = () => { /*console.log("anchor lockd!")*/ };
  exports.$updateAnchorsGetter = function(u) {
    const effect_anchors = this.effect_anchors;
    for (const key in u) {
      const getter = u[key];
      // const VALUE_KEY = `$${key}$value`;
      const GETTER_KEY = `$${key}$getter`;
      const SETTER_KEY = `$${key}$setter`;
      effect_anchors[GETTER_KEY] =
        effect_anchors[SETTER_KEY] = null;

      if (getter) {
        effect_anchors[key] = getter();
        effect_anchors[GETTER_KEY] = getter;
        effect_anchors[SETTER_KEY] = anchors_lock_setter;
      }
    }
  };
  return exports;
})();

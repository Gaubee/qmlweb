class Container extends PixiObject {
  static setupMaskProperty(obj, key) {
    QmlWeb.createProperty("var", obj, key, {
      getter() {
        if (!this.val && this.val_buider instanceof Function) {
          const val_buider = this.val_buider;
          this.val_buider = val_buider;
          this.val = val_buider(this.old_val);
        }
        return this.val;
      },
      setter(newVal) {
        if (newVal instanceof PIXI.Container) {
          this.val = newVal;
        } else if (newVal instanceof Function) {
          this.val_buider = newVal;
          this.old_val = this.val;
          this.val = null; // emit changed
        }
      }
    });
  }
  constructor(meta) {
    super(meta);
    this.changed = QmlWeb.Signal.signal([], {
      obj: this
    });
    QmlWeb.createProperties(this, {
      mask: "Item",
      opacity: {
        type: "real",
        initialValue: 1
      }
    });
    Container.setupMaskProperty(this, "SELF");
    this.SELF = () => this.dom;
    this.childrensChanged.connect(this, this.$onChildrensChanged);
    this.parentChanged.connect(this, this.$onChildrensChanged);
    this.dom = new PIXI.Container();
    const LifecycleKeys = [
      "init"
    ];
    const PixiLifecycle = {};
    LifecycleKeys.forEach(signal_key => {
      QmlWeb.delayInitProperty(PixiLifecycle, signal_key, (obj, signal_key) => {
        const signal = new Signal([], {
          obj: this
        });
        if (signal_key === "init") {
          QmlWeb.engine.completedSignals.push(signal.signal);
        }
        return signal;
      });
    });
    this.Lifecycle = this.events = PixiLifecycle;

    // change position
    this.xChanged.connect(this, this.$reDrawXY);
    this.yChanged.connect(this, this.$reDrawXY);
    this.maskChanged.connect(this, this.$onMaskChanged);
    this.opacityChanged.connect(this, this.$onOpacityChanged);
  }
  updateGeometry() {
    const bounds = this.dom.getLocalBounds();
    this.width = bounds.width;
    this.height = bounds.height;
    this.x = bounds.x;
    this.y = bounds.y;
  }
  $onChildrensChanged(newData) {
    if (this.dom.parent) {
      const container = this.dom;
      this.childrens.map(node => {
        if (node.dom instanceof PIXI.DisplayObject && node.dom.parent !== container) {
          container.addChild(node.dom);
          node.parent = this;
        }
      });
    }
  }
  $reDrawXY() {
    QmlWeb.nextTickWithId(() => {
      // console.log('left:', this.left, 'top:', this.top)
      this.dom.position.set(this.x, this.y);
    }, `${this.$uid}|reDrawXY`);
  }
  $onMaskChanged(newItem) {
    const container = this.dom;
    let oldMask, newMask;
    if (container.mask) {
      oldMask = container.mask;
      // container.mask = null;
      // oldMask.emit("unMask", this);
    }
    if (newItem) {
      let mask;
      if (newItem instanceof PIXI.Container) {
        newMask = newItem;
      }
    }
    if (newMask) {
      if (oldMask) {
        if (newMask !== oldMask) {
          oldMask.emit("unMask", this);
          container.mask = newMask;
          newMask.emit("inMask", this);
        }
      } else {
        container.mask = newMask;
        newMask.emit("inMask", this);
      }
    } else if (newItem) {
        // reset to null
      this.$properties.mask.set(null, QMLProperty.ReasonInner);
    } else {
      container.mask = null;
    }
  }
  $onOpacityChanged(newVal) {
    newVal = Math.max(Math.min(+newVal, 1), 0);
    this.dom.alpha = newVal;
  }
}

QmlWeb.Container = Container;

QmlWeb.registerPixiType({
  name: "Container",
}, Container);

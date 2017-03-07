class Container extends PixiObject {
  constructor(meta) {
    super(meta);
    this.changed = QmlWeb.Signal.signal([], {
      obj: this
    });
    QmlWeb.createProperties(this, {
      mask: "Item",
      clipMask: "Item",
      filterMask: "Item",
      opacity: {
        type: "real",
        initialValue: 1
      }
    });
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
    this.clipMaskChanged.connect(this, this.$onClipMaskChanged);
    this.filterMaskChanged.connect(this, this.$onFilterMaskChanged);
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
        if (node.dom instanceof PIXI.DisplayObject &&
          node.dom.parent !== container) {
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

  $onMaskChanged(newItem, oldItem) {
    const container = this.dom;
    let oldMask, newMask;
    if (oldItem) {
      oldMask = oldItem.dom;
      // container.mask = null;
      // oldMask.emit("unMask", this);
    }
    if (newItem) {
      let mask;
      if (newItem instanceof PIXI.Container) {
        newMask = newItem;
      } else if (newItem instanceof QmlWeb.Graphics ||
        newItem instanceof QmlWeb.Image) {
        newMask = newItem.dom;
      }
    }
    if (oldMask) {
      const mask_ins = QmlWeb.Mask.getIns(oldItem);
      mask_ins.unBindMask(container);
    }
    if (newMask) {
      const mask_ins = QmlWeb.Mask.getIns(newItem);
      mask_ins.bindMask(container);
    }
  }
  $onClipMaskChanged(newItem, oldItem) {
    const container = this.dom;
    let oldMask, newMask;
    if (oldItem) {
      oldMask = oldItem.dom;
      // container.mask = null;
      // oldMask.emit("unMask", this);
    }
    if (newItem) {
      let mask;
      if (newItem instanceof QmlWeb.Graphics) {
        newMask = newItem.dom;
      }
    }
    if (oldMask) {
      if (container._mask_change_handler) {
        container.mask = null;
      }
    }
    if (newMask) {
      container.mask = newMask;
    }
  }
  $onOpacityChanged(newVal) {
    newVal = Math.max(Math.min(+newVal, 1), 0);
    this.dom.alpha = newVal;
  }
  addFilter(filter) {
    const filters = this.dom.filters;
    if (filters) {
      filters.push(filter)
    } else {
      this.dom.filters = [filter]
    }
  }
  removeFilter(filter) {
    const filters = this.dom.filters;
    if (filters && filters.length) {
      const rm_index = filters.indexOf(filter);
      if (rm_index !== -1) {
        filters.splice(rm_index, 1)
      }
    }
  }
  $onFilterMaskChanged(newVal) {
    if (newVal instanceof Container) {
      let sprite = newVal.dom;
      const MaskFilter = QmlWeb.MaskFilter;
      if (!(sprite instanceof PIXI.Sprite)) {
        sprite = MaskFilter.ContainerToSprite(sprite, newVal.getRenderer());
      }
      const mask_filter = this._mask_filter = new MaskFilter(sprite);
      this.addFilter(mask_filter);
    } else {
      const filter = this.dom.filter;
      const mask_filter = this._mask_filter;
      if (mask_filter) {
        this.removeFilter(mask_filter);
      }
    }
  }
}

QmlWeb.registerPixiType({
  global: 1,
  name: "Container",
}, Container);
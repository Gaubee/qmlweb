class Container extends PixiObject {
  constructor(meta) {
    super(meta);
    this.childrensChanged.connect(this, this.$onChildrensChanged);
    this.parentChanged.connect(this, this.$onChildrensChanged);
    this.dom = new PIXI.Container();
    const LifecycleKeys = [
      "init"
    ]
    const PixiLifecycle = {};
    LifecycleKeys.forEach(signal_key => {
      QmlWeb.delayInitProperty(PixiLifecycle, signal_key, (obj, signal_key) => {
        const signal = new Signal([], {
          obj: this
        })
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
}



// LifecycleKeys.forEach(signal_key => {
//   QmlWeb.setupGetter(Container.prototype, signal_key, () => {
//     const signal = new Signal.signal();
//     if (signal_key === "onInit") {
//       debugger
//       QmlWeb.engine.completedSignals.push(signal);
//     }
//     delete this[signal_key];
//     Object.defineProperty(this, signal_key, {
//       value: signal,
//       configurable: true,
//       enumerable: false,
//       writable: false
//     });
//     return signal;
//   });
// });


QmlWeb.registerPixiType({
  name: "Container",
}, Container);
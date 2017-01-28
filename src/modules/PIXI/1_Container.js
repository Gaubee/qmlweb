class Container extends PixiObject {
  constructor(meta) {
    super(meta);
    this.childrensChanged.connect(this, this.$onChildrensChanged);
    QmlWeb.initQmlType(this, meta);
    this.dom = new PIXI.Container();
    const LifecycleKeys = [
      // "onChanges",
      // "onInit",
      // "afterContentInit",
      // "afterViewInit",
      // "onDestroy"
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
    this.Lifecycle = PixiLifecycle;
  }
  updateGeometry() {
    const bounds = this.dom.getLocalBounds();
    this.width = bounds.width;
    this.height = bounds.height;
    this.x = bounds.x;
    this.y = bounds.y;
  }
  $onChildrensChanged(newData) {
    const childrens = [];
    const container = this.dom;
    newData.map(node => {
      node.parent = this;
      if (node.dom instanceof PIXI.DisplayObject && node.dom.parent !== container) {
        childrens.push(node.dom);
      }
    })
    container.addChild(...childrens);
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
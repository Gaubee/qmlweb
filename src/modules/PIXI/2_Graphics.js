class Graphics extends QmlWeb.Container {
  constructor(meta) {
    super(meta);
    QmlWeb.initQmlType(this, meta);
    this.dom = new PIXI.Graphics();
    QmlWeb.createProperties(this, {
      color: "color"
    });
  }
}
QmlWeb.registerPixiType({
  global: 1,
  name: "Graphics",
}, Graphics);

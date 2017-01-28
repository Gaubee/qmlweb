class Graphics extends Container {
  constructor(meta) {
    super(meta);
    QmlWeb.initQmlType(this, meta);
    const graphics = this.dom = new PIXI.Graphics();
    QmlWeb.createProperties(this, {
      color: "color"
    });
  }
}
QmlWeb.registerPixiType({
  name: "Graphics",
}, Graphics)
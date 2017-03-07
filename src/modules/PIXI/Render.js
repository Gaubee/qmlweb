QmlWeb.nextTick = function(tick_handle) {
  requestAnimationFrame(tick_handle);
};
const TICK_HANDLE_ID_MAP = {};
QmlWeb.nextTickWithId = function(tick_handle, id) {
  if (!TICK_HANDLE_ID_MAP[id]) {
    TICK_HANDLE_ID_MAP[id] = true;
    requestAnimationFrame(() => {
      TICK_HANDLE_ID_MAP[id] = false;
      tick_handle();
    });
  }
};
class Renderer extends QmlWeb.PixiObject {
  constructor(meta) {
    super(meta);
    QmlWeb.createProperties(this, {
      color: "color"
    });
    const renderer = this.renderer =
      PIXI.autoDetectRenderer(this.width, this.height, {
        autoResize: true,
        antialias: true,
        transparent: true,
        resolution: 1
      });
    this.dom = this.renderer.view;
    this.widthChanged.connect(this, this.$onWidthHeightChanged);
    this.heightChanged.connect(this, this.$onWidthHeightChanged);
    this.childrensChanged.connect(this, this.$onChildrensChanged);
    this.colorChanged.connect(this, this.$onColorChanged);


    const stage = this.stage = new PIXI.Container();

    function animate() {
      renderer.render(stage);
      QmlWeb.nextTick(animate);
    }
    animate();
  }
  $onWidthHeightChanged() {
    this.reisze(this.width, this.height);
  }
  reisze(width, height) {
    this.renderer.resize(width, height);
  }
  $onChildrensChanged(newData) {
    const container = this.stage;
    newData.map(node => {
      if (node.dom instanceof PIXI.DisplayObject && node.dom.parent !== container) {
        container.addChild(node.dom);
        node.parent = this;
      }
    });
  }
  $onColorChanged(newColor){
    if(newColor){
      this.renderer.transparent = false;
      this.renderer.backgroundColor = (newColor&&newColor.$number)||0xFFFFFF;
    }else{
      this.renderer.transparent = true;
    }
  }
}
QmlWeb.registerPixiType({
  global: 1,
  name: "Renderer"
}, Renderer);
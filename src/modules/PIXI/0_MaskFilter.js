QmlWeb.Mask = class Mask {
  static getIns(mask) {
    return mask.__mask_ins || (mask.__mask_ins = new Mask(mask));
  }
  constructor(mask) {
    const self = this;
    const renderer = mask.getRenderer();
    let method_name = "renderCanvas";
    if (renderer.type === PIXI.RENDERER_TYPE.WEBGL) {
      method_name = "renderWebGL"
    }
    const con = mask.dom;
    const is_inited = con._is_as_mask;
    const oldMethod = con[method_name].bind(con);
    if (mask instanceof QmlWeb.Graphics) {
      if (!is_inited) {
        con._is_as_mask = true;
        con[method_name] = function(renderer) {
          if (this.dirty) {
            let old_renderable = this.renderable;
            const old_mask_sprite = this._mask_sprite;
            this.renderable = true;
            const new_mask_sprite = self.mask = this._mask_sprite =
              new PIXI.Sprite(this.generateCanvasTexture());
            this.renderable = old_renderable;
            this.addChild(new_mask_sprite);
            this.emit('mask-changed', new_mask_sprite);
            if (old_mask_sprite) {
              this.removeChild(old_mask_sprite);
              old_mask_sprite.destroy(true);
            }
          }
          oldMethod(renderer);
        }
      }
    } else if (mask instanceof QmlWeb.Image) {
      if (!is_inited) {
        con._is_as_mask = true;
        con._mask_sprite = null;
        var _is_lock;
        con[method_name] = function(renderer) {
          if (!_is_lock) {
            _is_lock = true;
            if (mask.dirty) {
              mask.dirty = false;
              QmlWeb.nextTick(() => {
                const old_mask_sprite = this._mask_sprite;
                let old_renderable = this.renderable;
                this.renderable = true;
                const new_mask_sprite = self.mask = this._mask_sprite =
                  new PIXI.Sprite(renderer.generateTexture(this));
                this.renderable = old_renderable;
                this.addChild(new_mask_sprite);
                this.emit('mask-changed', new_mask_sprite);
                if (old_mask_sprite) {
                  this.removeChild(old_mask_sprite);
                  old_mask_sprite.destroy(true);
                }
                _is_lock = false;
              })
            } else {
              _is_lock = false;
            }
          }

          oldMethod(renderer);
        }
      }
    }
    self.qmlobj = mask;
    self.dom = con;
    self.renderer = renderer;
    self.mask = null;
    self.bind_count = 0;
  }
  getMask(cb) {
    if (this.mask) {
      cb(this.mask);
    } else {
      this.dom.on('mask-changed', new_mask_sprite => {
        cb(new_mask_sprite);
      });
    }
  }
  bindMask(container) {
    this.bind_count += 1;
    container.mask = this.mask;
    this.dom.on('mask-changed', container._mask_change_handler =
      (new_mask_sprite) => {
        container.mask = new_mask_sprite;
      });
    this.dom.renderable = false;
  }
  unBindMask(container) {
    if (container._mask_change_handler) {
      this.bind_count -= 1;
      this.dom.off('mask-changed', container._mask_change_handler);
      container._mask_change_handler = null;
      container.mask = null;
      if (this.bind_count == 0) {
        this.dom.renderable = true;
      }
    }
  }
};
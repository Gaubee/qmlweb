const BEZIER_CIRCLE = 0.552284749831;
const BEZIER_CIRCLE_H = 1 - BEZIER_CIRCLE;
const AllRadiusEffectKeys = [
  "TopLeftX",
  "TopLeftY",
  "TopRightX",
  "TopRightY",
  "BottomLeftX",
  "BottomLeftY",
  "BottomRightX",
  "BottomRightY",
];

function drawRoundedRectangle(drawer,
  innerX, innerY, innerEndX, innerEndY,

  TopLeftX,
  TopLeftY,
  TopRightX,
  TopRightY,
  BottomLeftX,
  BottomLeftY,
  BottomRightX,
  BottomRightY
) {
  // Draw Body
  drawer.moveTo(innerX, TopLeftY + innerY);
  // TopLeft
  drawer.bezierCurveTo(
    innerX, innerY + TopLeftY * BEZIER_CIRCLE_H,
    innerX + TopLeftX * BEZIER_CIRCLE_H, innerY,
    innerX + TopLeftX, innerY
  );
  drawer.lineTo(innerEndX - TopRightX, innerY);
  //TopRight
  drawer.bezierCurveTo(
    innerEndX - TopRightX * BEZIER_CIRCLE_H, innerY,
    innerEndX, innerY + TopRightY * BEZIER_CIRCLE_H,
    innerEndX, innerY + TopRightY
  );
  // BottomRight
  drawer.lineTo(innerEndX, innerEndY - BottomRightY);
  drawer.bezierCurveTo(
    innerEndX, innerEndY - BottomRightY * BEZIER_CIRCLE_H,
    innerEndX - BottomRightX * BEZIER_CIRCLE_H, innerEndY,
    innerEndX - BottomRightX, innerEndY
  );
  // BottomLeft
  drawer.lineTo(BottomLeftX + innerX, innerEndY);
  drawer.bezierCurveTo(
    innerX + BottomLeftX * BEZIER_CIRCLE_H, innerEndY,
    innerX, innerEndY - BottomLeftY * BEZIER_CIRCLE_H,
    innerX, innerEndY - BottomLeftY
  );
  drawer.closePath();
}

function applyDrawRoundedRectangle(args, first_arg) {
  args[0] = first_arg;
  drawRoundedRectangle(...args);
}

function drawRectangleBorder(drawer,
  width, height,
  topSize,
  leftSize = topSize,
  bottomSize = topSize,
  rightSize = topSize
) {
  drawer.drawRect(0, 0, width, topSize); //top
  drawer.drawRect(0, topSize, leftSize, height - bottomSize); //left
  drawer.drawRect(width - rightSize, topSize,
    rightSize, height - bottomSize); //right
  drawer.drawRect(leftSize, height - bottomSize,
    width - rightSize - leftSize, bottomSize); //bottom
}
class Rectangle extends QmlWeb.Graphics {
  constructor(meta) {
    super(meta);
    this.color = "#FFFFFF";
    const border = new QmlWeb.QObject(this);
    QmlWeb.createProperty("var", this, "border", {
      getter() {
        return border;
      },
      setter() {}
    });
    const border_dom = border.dom = new PIXI.Graphics();
    this.dom.addChild(border_dom);

    QmlWeb.createProperties(border, {
      color: {
        type: "color",
        initialValue: "black"
      },
      width: {
        type: "int",
        initialValue: 0
      },
    });

    QmlWeb.setupGetter(border, "forMask", () => border.dom.mask || border.dom);

    border.widthChanged.connect(this, this.$reDrawWH);
    border.colorChanged.connect(this, this.$reDrawWH);
    this.colorChanged.connect(this, this.$reDrawWH);
    this.widthChanged.connect(this, this.$reDrawWH);
    this.heightChanged.connect(this, this.$reDrawWH);

    const effect_radius_values = this.effect_radius_values = {
      _: null, // The discarded value
      _cache_value: "",
      is_use_radius: false,
      // TopLeftX: 0,
      // TopLeftY: 0,
      // TopRightX: 0,
      // TopRightY: 0,
      // BottomLeftX: 0,
      // BottomLeftY: 0,
      // BottomRightX: 0,
      // BottomRightY: 0,
      maxRadiusX: 0, // = Math.max(this.width / 2 - 1, 0);
      maxRadiusY: 0, // = Math.max(this.height / 2 - 1, 0);
    };
    [
      "TopLeft",
      "TopRight",
      "BottomLeft",
      "BottomRight",
    ].forEach(key => {
      let val_X = 0;
      QmlWeb.setupGetterSetter(effect_radius_values, `${key}X`,
        //getter
        () => Math.min(effect_radius_values.maxRadiusX, val_X),
        newVal => {
          val_X = newVal;
        }
      );
      let val_Y = 0;
      QmlWeb.setupGetterSetter(effect_radius_values, `${key}Y`,
        //getter
        () => Math.min(effect_radius_values.maxRadiusY, val_Y),
        newVal => {
          val_Y = newVal;
        }
      );
    });

    QmlWeb.createProperties(this, {
      radius: "var",
      radiusTopLeft: "var",
      radiusTopRight: "var",
      radiusBottomLeft: "var",
      radiusBottomRight: "var",
    });
    this.radiusChanged.connect(this, this.$onRadiusChanged);
    this.radiusTopLeftChanged.connect(this, this.$onSOMERadiusChanged);
    this.radiusTopRightChanged.connect(this, this.$onSOMERadiusChanged);
    this.radiusBottomLeftChanged.connect(this, this.$onSOMERadiusChanged);
    this.radiusBottomRightChanged.connect(this, this.$onSOMERadiusChanged);
    this.widthChanged.connect(newVal => {
      effect_radius_values.maxRadiusX = Math.max(newVal / 2 - 1, 0);
      this.$checkRadiusAndReDraw();
    });
    this.heightChanged.connect(newVal => {
      effect_radius_values.maxRadiusY = Math.max(newVal / 2 - 1, 0);
      this.$checkRadiusAndReDraw();
    });
  }
  static createMaskGenerator(container, drawHandle) {
    return function(_dom_mask) {
      let dom_mask = _dom_mask;
      if (!dom_mask) {
        dom_mask = new PIXI.Graphics();
        let refs = 0;
        dom_mask.on("inMask", () => {
          refs += 1;
          if (refs === 1) {
            container.addChild(dom_mask);
          }
        });
        dom_mask.on("unMask", () => {
          refs -= 1;
          if (refs === 0) {
            container.removeChild(dom_mask);
          }
        });
      } else {
        dom_mask.clear();
      }
      drawHandle(dom_mask);
      return dom_mask;
    };
  }
  $reDrawWH() {
    QmlWeb.nextTickWithId(() => {
      const width = this.width;
      const height = this.height;
      const min_size = Math.min(width, height);
      const graphics = this.dom;
      graphics.clear();
      graphics.lineStyle(0, 0, 0);
      const border = this.border;
      const border_graphics = border.dom;
      border_graphics.clear();
      border_graphics.lineStyle(0, 0, 0);
      const border_width = border.width;
      const border_color = border.color;
      const double_border_width = border_width + border_width;
      const color = this.color;
      const effect_radius_values = this.effect_radius_values;

      border_graphics.beginFill(border_color.$number, border_color.$a);
      graphics.beginFill(color.$number, color.$a);

      // graphics.lineStyle(10, 0, 0.3);
      if (effect_radius_values.is_use_radius) { // Draw Radius Border
        const {
          TopLeftX,
          TopLeftY,
          TopRightX,
          TopRightY,
          BottomLeftX,
          BottomLeftY,
          BottomRightX,
          BottomRightY,
        } = effect_radius_values;

        const drawFullArgs = [null,
          0, 0, width, height,
          TopLeftX,
          TopLeftY,
          TopRightX,
          TopRightY,
          BottomLeftX,
          BottomLeftY,
          BottomRightX,
          BottomRightY
        ];
        if (border_width) {
          if (border_width >= min_size / 2) {
            // Only Draw Border
            applyDrawRoundedRectangle(drawFullArgs, border_graphics);
          } else {
            // Draw Border And Body
            const innerRateX = (width - double_border_width) / width;
            const innerRateY = (height - double_border_width) / height;
            const drawInnerArgs = [null,
              border_width, border_width,
              width - border_width, height - border_width,
              TopLeftX * innerRateX,
              TopLeftY * innerRateY,
              TopRightX * innerRateX,
              TopRightY * innerRateY,
              BottomLeftX * innerRateX,
              BottomLeftY * innerRateY,
              BottomRightX * innerRateX,
              BottomRightY * innerRateY
            ];
            // Draw Border
            applyDrawRoundedRectangle(drawFullArgs, border_graphics);

            // Draw Border Mask
            let border_masking_graphics = border_graphics.mask;
            if (!border_masking_graphics) {
              // TODO:remove mask children,
              // If there is no need to render the elements
              // cause performance problems.
              border_masking_graphics = border_graphics.__mask;
              if (border_masking_graphics) {
                border_masking_graphics.clear();
              } else {
                border_masking_graphics = border_graphics.__mask =
                  new PIXI.Graphics();
                border_graphics.addChild(border_masking_graphics);
              }
              border_graphics.mask = border_masking_graphics;
              border_masking_graphics.endFill();
            } else {
              border_masking_graphics.clear();
            }
            border_masking_graphics.beginFill(0, 1);
            applyDrawRoundedRectangle(drawFullArgs, border_masking_graphics);
            border_masking_graphics.endFill();
            border_masking_graphics.beginFill(0xFFFFFF, 1);
            applyDrawRoundedRectangle(drawInnerArgs, border_masking_graphics);
            border_masking_graphics.endFill();

            // Draw Body
            applyDrawRoundedRectangle(drawInnerArgs, graphics);
          }
        } else {
          // Only Draw Body
          applyDrawRoundedRectangle(drawFullArgs, graphics);
        }
      } else { // Only Draw Rect
        if (border_width) { // Draw Border And Body
          if (border_width >= min_size / 2) { // Only Draw Border, No Body
            border_graphics.drawRect(0, 0, width, height);
          } else {
            // Draw Border
            drawRectangleBorder(border_graphics, width, height,
              border_width
            );

            // Draw Body
            graphics.drawRect(border_width, border_width,
              width - double_border_width, height - double_border_width);
          }
        } else { // Only Draw Body
          graphics.drawRect(0, 0, width, height);
        }
      }
      border_graphics.endFill();
      graphics.endFill();
    }, `${this.$uid}|reDrawWH`);
  }
  $onRadiusChanged(newVal) {
    const effect_radius_values = this.effect_radius_values;

    const effectKeys = AllRadiusEffectKeys.map((key) => {
      const full_key = `radius${key.substr(0, key.length - 1)}`;
      return this[full_key] === undefined ? key : "_";
    });

    let listVal;
    if (typeof newVal === "number") {
      const resVal = newVal <= 0 ? 0 : newVal;
      effectKeys.forEach(key => {
        effect_radius_values[key] = resVal;
      });
    } else {
      if (typeof newVal === "string") {
        listVal = newVal.trim().split(/\s+/);
      } else if (newVal instanceof Array) {
        listVal = newVal;
      } else {
        throw new TypeError("radius must be an string or array.");
      }
      if (!listVal.length) {
        return;
      }

      let resVal_TL;
      let resVal_BR;
      let resVal_TR;
      let resVal_BL;
      if (listVal.length === 1) {
        const resVal = Math.max(parseFloat(listVal[0]), 0) || 0;
        effectKeys.forEach(key => {
          effect_radius_values[key] = resVal;
        });
      } else {
        switch (listVal.length) {
          case 2:
            // top-left-and-bottom-right top-right-and-bottom-left
            resVal_TL = resVal_BR = Math.max(parseFloat(listVal[0]), 0) || 0;
            resVal_TR = resVal_BL = Math.max(parseFloat(listVal[1]), 0) || 0;
            break;
          case 3:
            // top-left top-right-and-bottom-left bottom-right
            resVal_TL = Math.max(parseFloat(listVal[0]), 0) || 0;
            resVal_TR = resVal_BL = Math.max(parseFloat(listVal[1]), 0) || 0;
            resVal_BR = Math.max(parseFloat(listVal[2]), 0) || 0;
            break;
          default: // >=4
            // top-left top-right bottom-right bottom-left
            resVal_TL = Math.max(parseFloat(listVal[0]), 0) || 0;
            resVal_TR = Math.max(parseFloat(listVal[1]), 0) || 0;
            resVal_BR = Math.max(parseFloat(listVal[2]), 0) || 0;
            resVal_BL = Math.max(parseFloat(listVal[3]), 0) || 0;
        }
        effectKeys.forEach((key, i) => {
          if (i < 2) {
            effect_radius_values[key] = resVal_TL;
          } else if (i < 4) {
            effect_radius_values[key] = resVal_TR;
          } else if (i < 6) {
            effect_radius_values[key] = resVal_BL;
          } else {
            effect_radius_values[key] = resVal_BR;
          }
        });
      }
    }

    this.$checkRadiusAndReDraw();
  }
  $onSOMERadiusChanged(newVal, oldVal, name) {
    const effect_radius_values = this.effect_radius_values;
    const effectKey = name.replace("radius", "");

    const effectKeys = [
      `${effectKey}X`,
      `${effectKey}Y`,
    ];

    let listVal;
    if (typeof newVal === "number") {
      const resVal = newVal <= 0 ? 0 : newVal;
      effectKeys.forEach(key => {
        effect_radius_values[key] = resVal;
      });
    } else {
      if (typeof newVal === "string") {
        listVal = newVal.trim().split(/\s+/);
      } else if (newVal instanceof Array) {
        listVal = newVal;
      } else {
        throw new TypeError("radius must be an string or array.");
      }
      if (!listVal.length) {
        return;
      }
      if (listVal.length === 1) {
        const resVal = Math.max(parseFloat(listVal[0]), 0) || 0;
        effectKeys.forEach(key => {
          effect_radius_values[key] = resVal;
        });
      } else {
        effectKeys.forEach((key, i) => {
          effect_radius_values[key] =
            Math.max(parseFloat(listVal[i]), 0) || 0;
        });
      }
    }
    this.$checkRadiusAndReDraw();
  }
  $checkRadiusAndReDraw() {
    const effect_radius_values = this.effect_radius_values;
    const _new_value = AllRadiusEffectKeys.map(key =>
        effect_radius_values[key])
      .join();
    if (effect_radius_values._cache_value !== _new_value) {
      effect_radius_values._cache_value = _new_value;
      effect_radius_values.is_use_radius = _new_value !== "0,0,0,0,0,0,0,0";
      this.$reDrawWH();
    }
    effect_radius_values.is_use_radius = AllRadiusEffectKeys.some(key =>
      // > 0
      effect_radius_values[key]);
  }
}
Rectangle.drawRoundedRectangle = drawRoundedRectangle;
Rectangle.drawRectangleBorder = drawRectangleBorder;

QmlWeb.registerPixiType({
  global: 1,
  name: "Rectangle",
}, Rectangle);
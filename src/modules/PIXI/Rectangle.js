const BEZIER_CIRCLE = 0.552284749831;
const BEZIER_CIRCLE_H = 1 - BEZIER_CIRCLE;
class Rectangle extends Graphics {
	static DrawRoundedRectangle(drawer,
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
	constructor(meta) {
		super(meta);
		this.color = "#FFFFFF";
		this.border = new QmlWeb.QObject(this);
		const border_dom = this.dom$border = new PIXI.Graphics();
		this.dom.addChild(border_dom);

		QmlWeb.createProperties(this.border, {
			color: {
				type: "color",
				initialValue: "black"
			},
			width: {
				type: "int",
				initialValue: 0
			}
		});

		this.border.widthChanged.connect(this, this.$reDrawWH);
		this.border.colorChanged.connect(this, this.$reDrawWH);
		this.colorChanged.connect(this, this.$reDrawWH);
		this.widthChanged.connect(this, this.$reDrawWH);
		this.heightChanged.connect(this, this.$reDrawWH);

		this.effect_border_values = {
			_: null, // The discarded value
			_cache_value: "",
			is_use_radius: false,
			TopLeftX: 0,
			TopLeftY: 0,
			TopRightX: 0,
			TopRightY: 0,
			BottomLeftX: 0,
			BottomLeftY: 0,
			BottomRightX: 0,
			BottomRightY: 0,
		};
		QmlWeb.createProperties(this, {
			radius: "var",
			radiusTopLeft: "var",
			radiusTopRight: "var",
			radiusBottomLeft: "var",
			radiusBottomRight: "var",
		});
		this.radiusChanged.connect(this, this.$onRaduisChanged);
		this.radiusTopLeftChanged.connect(this, this.$onRaduisChanged);
		this.radiusTopRightChanged.connect(this, this.$onRaduisChanged);
		this.radiusBottomLeftChanged.connect(this, this.$onRaduisChanged);
		this.radiusBottomRightChanged.connect(this, this.$onRaduisChanged);
	}
	$reDrawWH() {
		QmlWeb.nextTickWithId(() => {
			const width = this.width;
			const height = this.height;
			const min_size = Math.min(width, height);
			// console.log('width:', width, 'height:', height)
			const graphics = this.dom;
			const border_graphics = this.dom$border
			border_graphics.clear();
			graphics.clear();
			graphics.lineStyle(0, 0, 0);
			border_graphics.lineStyle(0, 0, 0);
			const border = this.border;
			const border_width = border.width;
			const border_color = border.color;
			const double_border_width = border_width + border_width;
			const color = this.color;
			const radius = this.radius || 0;
			const radiusTopLeft = this.radiusTopLeft || radius;
			const radiusTopRight = this.radiusTopRight || radius;
			const radiusBottomLeft = this.radiusBottomLeft || radius;
			const radiusBottomRight = this.radiusBottomRight || radius;
			const effect_border_values = this.effect_border_values;

			border_graphics.beginFill(border_color.$number, border_color.$a)
			graphics.beginFill(color.$number, color.$a);
			// graphics.lineStyle(10, 0, 0.3);
			if (effect_border_values.is_use_radius) { // Draw Radius Border
				const {
					TopLeftX,
					TopLeftY,
					TopRightX,
					TopRightY,
					BottomLeftX,
					BottomLeftY,
					BottomRightX,
					BottomRightY,
				} = effect_border_values;

				let body_drawer = graphics;
				if (border_width === 0 ||
					(border_width >= min_size / 2 && (body_drawer = border_graphics))
				) {
					// Only Draw Border, No Body
					// Or Only Draw Body
					Rectangle.DrawRoundedRectangle(body_drawer,
						0, 0, width, height,
						TopLeftX,
						TopLeftY,
						TopRightX,
						TopRightY,
						BottomLeftX,
						BottomLeftY,
						BottomRightX,
						BottomRightY
					);
				} else { // Draw Border And Body
					const drawFullArgs = [border_graphics,
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
					const innerRateX = (width - double_border_width) / width;
					const innerRateY = (height - double_border_width) / height;
					const drawInnerArgs = [null,
						border_width, border_width, width - border_width, height - border_width,
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
					Rectangle.DrawRoundedRectangle.apply(null, drawFullArgs);

					let border_masking_graphics = border_graphics.mask;
					if (!border_masking_graphics) {
						// TODO:remove mask children, If there is no need to render the elements cause performance problems.
						if (border_masking_graphics = border_graphics.__mask) {
							border_masking_graphics.clear();
						} else {
							border_masking_graphics = border_graphics.__mask = new PIXI.Graphics();
						}
						border_graphics.mask = border_masking_graphics;
						border_graphics.addChild(border_masking_graphics);
					} else {
						border_masking_graphics.clear();
					}

					border_masking_graphics.beginFill(0, 1);
					Rectangle.DrawRoundedRectangle(border_masking_graphics,
						0, 0, width, height,
						TopLeftX,
						TopLeftY,
						TopRightX,
						TopRightY,
						BottomLeftX,
						BottomLeftY,
						BottomRightX,
						BottomRightY
					);
					border_masking_graphics.endFill()
					border_masking_graphics.beginFill(0xFFFFFF, 1);
					Rectangle.DrawRoundedRectangle(border_masking_graphics,
						border_width, border_width, width - border_width, height - border_width,
						TopLeftX * innerRateX,
						TopLeftY * innerRateY,
						TopRightX * innerRateX,
						TopRightY * innerRateY,
						BottomLeftX * innerRateX,
						BottomLeftY * innerRateY,
						BottomRightX * innerRateX,
						BottomRightY * innerRateY
					);
					border_masking_graphics.endFill()


					// Draw Body
					Rectangle.DrawRoundedRectangle(graphics,
						border_width, border_width, width - border_width, height - border_width,
						TopLeftX * innerRateX,
						TopLeftY * innerRateY,
						TopRightX * innerRateX,
						TopRightY * innerRateY,
						BottomLeftX * innerRateX,
						BottomLeftY * innerRateY,
						BottomRightX * innerRateX,
						BottomRightY * innerRateY
					);
				}
			} else { // Only Draw Rect
				if (border_width) { // Draw Border And Body
					if (border_width >= min_size / 2) { // Only Draw Border, No Body
						border_graphics.drawRect(0, 0, width, height);
					} else {
						// Draw Border
						border_graphics.drawRect(0, 0, width, border_width); //top
						border_graphics.drawRect(0, height - border_width, width, border_width); //bottom
						border_graphics.drawRect(0, border_width, border_width, height - double_border_width); //left
						border_graphics.drawRect(width - border_width, border_width, border_width, height - double_border_width); //right

						// Draw Body
						graphics.drawRect(border_width, border_width, width - double_border_width, height - double_border_width);
					}
				} else { // Only Draw Body
					graphics.drawRect(0, 0, width, height);
				}
			}
			border_graphics.endFill();
			graphics.endFill();

		}, `${this.$uid}|reDrawWH`);
	}
	$onRaduisChanged(newVal, oldVal, name) {
		const effect_border_values = this.effect_border_values;
		const effectKey = name.replace("radius", "");
		const allEffectKeys = [
			"TopLeftX",
			"TopLeftY",
			"TopRightX",
			"TopRightY",
			"BottomLeftX",
			"BottomLeftY",
			"BottomRightX",
			"BottomRightY",
		]
		const effectKeys = effectKey ? [
			`${effectKey}X`,
			`${effectKey}Y`,
		] : allEffectKeys.map((key) => this[`radius${key.substr(0,key.length-1)}`] === undefined ? key : "_");

		let listVal;
		if (typeof newVal === "number") {
			const resVal = newVal <= 0 ? 0 : newVal;
			effectKeys.forEach(key => effect_border_values[key] = resVal);
		} else {
			if (typeof newVal === "string") {
				listVal = newVal.trim().split(/\s+/);
			} else if (newVal instanceof Array) {
				listVal = newVal
			}
			if (listVal && listVal.length) {
				if (effectKey) { // SOMEraduis
					if (listVal.length === 1) {
						const resVal = Math.max(parseFloat(listVal[0]), 0) || 0;
						effectKeys.forEach(key => effect_border_values[key] = resVal)
					} else {
						effectKeys.forEach((key, i) =>
							effect_border_values[key] =
							Math.max(parseFloat(listVal[i]), 0) || 0)
					}
				} else { // raduis
					let resVal_TF,
						resVal_BR,
						resVal_TR,
						resVal_BL;
					if (listVal.length === 1) {
						const resVal = Math.max(parseFloat(listVal[0]), 0) || 0;
						effectKeys.forEach(key => effect_border_values[key] = resVal)
					} else {
						if (listVal.length === 2) {
							// top-left-and-bottom-right top-right-and-bottom-left 
							resVal_TF = resVal_BR = Math.max(parseFloat(listVal[0]), 0) || 0;
							resVal_TR = resVal_BL = Math.max(parseFloat(listVal[1]), 0) || 0;

						} else if (listVal.length === 3) {
							// top-left top-right-and-bottom-left bottom-right 
							resVal_TF = Math.max(parseFloat(listVal[0]), 0) || 0;
							resVal_TR = resVal_BL = Math.max(parseFloat(listVal[1]), 0) || 0;
							resVal_BR = Math.max(parseFloat(listVal[2]), 0) || 0;
						} else { // >= 4
							// top-left top-right bottom-right bottom-left 
							resVal_TF = Math.max(parseFloat(listVal[0]), 0) || 0;
							resVal_TR = Math.max(parseFloat(listVal[1]), 0) || 0;
							resVal_BR = Math.max(parseFloat(listVal[2]), 0) || 0;
							resVal_BL = Math.max(parseFloat(listVal[3]), 0) || 0;
						}
						effectKeys.forEach((key, i) => {
							if (i < 2) {
								effect_border_values[key] = resVal_TL;
							} else if (i < 4) {
								effect_border_values[key] = resVal_TR;
							} else if (i < 6) {
								effect_border_values[key] = resVal_BL;
							} else {
								effect_border_values[key] = resVal_BR;
							}
						});
					}
				}
			}
		}

		const maxRadiusX = this.width / 2 - 1;
		const maxRadiusY = this.height / 2 - 1;
		allEffectKeys.forEach((key, i) => {
			effect_border_values[key] = Math.min(effect_border_values[key],
				i % 2 ? maxRadiusY : maxRadiusX);
		});

		const _new_value = allEffectKeys.map(key => effect_border_values[key]).join();
		if (effect_border_values._cache_value !== _new_value) {
			effect_border_values._cache_value = _new_value;
			effect_border_values.is_use_radius = _new_value !== "0,0,0,0,0,0,0,0";
			this.$reDrawWH();
		}
		effect_border_values.is_use_radius = allEffectKeys.some(key =>
			// > 0
			effect_border_values[key]);
	}
}
QmlWeb.registerPixiType({
	name: "Rectangle",
}, Rectangle);
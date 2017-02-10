class Image extends Container {
	constructor(meta) {
		super(meta);
		const self = this;
		QmlWeb.createProperties(this, {
			progress: "real",
			src: "url",
			color: "color",
		});
		/** repeat
		 * Array
		 */
		this.$repeat_x = this.$repeat_y = true;
		QmlWeb.createProperty("var", this, "repeat", {
			setter(newVal) {
				if (self.$onSetRepeat(newVal)) {
					const newVal = this.val = [self.$repeat_x, self.$repeat_y];
				}
			}
		});
		const repeat_prop = this.$properties.repeat;
		repeat_prop.val = [this.$repeat_x, this.$repeat_y];

		/** source
		 * source.width/height/ratio/url
		 */
		const source = new QmlWeb.QObject(this);;
		QmlWeb.setupGetter(this, "source", () => source);
		[
			["url", "url", ""],
			["real", "ratio", 0],
			["real", "width", 0],
			["real", "height", 0],
		].forEach((info, i) => {
			const [type, key, default_val] = info;
			const getter_key = `__${key}`;
			source[getter_key] = default_val;
			QmlWeb.createProperty(type, source, key, {
				getter: () => source[getter_key],
				setter: function(newVal) {
					throw new TypeError(`Cannot assign to read-only property "source.${key}"`);
				}
			});
			if (i > 1) { // width/height
				const prop = source.$properties[key];
				prop.changed.connect(this, this.$reDrawTileWH);
			}
		});
		/** painted
		 * painted.width/height/ratio
		 */
		const painted = new QmlWeb.QObject(this);
		QmlWeb.setupGetter(this, "painted", () => painted);
		QmlWeb.createProperties(painted, {
			width: {
				type: "var",
				getter: function() {
					if (!isFinite(this.val)) {
						return self.width
					}
					return this.val
				}
			},
			height: {
				type: "var",
				getter: function() {
					if (!isFinite(this.val)) {
						return self.height
					}
					return this.val
				}
			},
			ratio: {
				type: "real",
				getter: () => {
					const ratio = painted.width / painted.height;
					if (!isFinite(ratio)) {
						return 0
					}
					return ratio;
				},
				setter: () => {
					throw new TypeError(`Cannot assign to read-only property "painted.ratio"`);
				}
			}
		});
		const painted_props = painted.$properties;
		["width", "height"].forEach(key => {
			const prop = painted_props[key]
			this[`${key}Changed`].connect((newVal, oldVal) => {
				if (newVal !== prop.val) {
					prop.changed(newVal, oldVal, key);
				}
			});
			prop.changed.connect(painted_props.ratio.changed);
			prop.changed.connect(this, this.$reDrawTileWH);
		});

		/** Code:Loader and Sripte
		 *
		 */
		const $htmlImage = this.$htmlImage = document.createElement("img");
		// canvas image can't Cross-domain, so can load the picture use ajax directly.
		const $request = this.$request = new XMLHttpRequest();
		$request.responseType = 'arraybuffer';
		$request.onload = (e) => {
			var blob = new Blob([$request.response]);
			$htmlImage.src = window.URL.createObjectURL(blob);
			// Texture.from(HTMLImageElement) vs BaseTexture.fromImage(src)
			const texture = PIXI.Texture.from($htmlImage);
			if (texture.baseTexture.hasLoaded) {
				this.$afterSourceChanged(texture);
			} else {
				texture.baseTexture.once("loaded", () => {
					this.$afterSourceChanged(texture)
				});
			}
		};
		$request.onprogress = (e) => {
			this.progress = e.loaded / e.total;
		};
		$request.onloadstart = () => {
			this.progress = 0;
		};

		const $sprite = this.$sprite = PIXI.extras.TilingSprite.from($htmlImage);
		this.dom.addChild($sprite);

		/** Lifecycle
		 *
		 */
		const LifecycleKeys = [
			"load",

			"progress",
			"loadstart",
			"loadend",
			"abort",
			"error",
		]
		const PixiLifecycle = this.Lifecycle;
		LifecycleKeys.forEach(signal_key => {
			QmlWeb.delayInitProperty(PixiLifecycle, signal_key, (obj, signal_key) => {
				const signal = new Signal([], {
					obj: this
				});
				switch (signal_key) {
					case "load":
						$htmlImage.addEventListener(signal_key, signal.signal);
						break;
					default:
						$request.addEventListener(signal_key, signal.signal)
				}
				return signal;
			});
		});

		this.colorChanged.connect(this, this.$onColorChanged);
		this.srcChanged.connect(this, this.$onSourceChanged);
		this.widthChanged.connect(this, this.$reDrawWH);
		this.heightChanged.connect(this, this.$reDrawWH);
	}
	abort() {
		const $request = this.$request;
		$request.abort();
	}
	$reDrawBG() {
		QmlWeb.nextTickWithId(() => {
			const color_dom = this.$bg_color_dom;
			color_dom.clear();
			const color = this.color;
			color_dom.beginFill(color.$number, color.$a);
			color_dom.drawRect(0, 0, this.width, this.height);
			color_dom.endFill();
		}, `${this.$uid}|reDrawBG`);
	}
	$onColorChanged(newColor) {
		const color_dom = this.$bg_color_dom;
		if (!color_dom) {
			this.$bg_color_dom = new PIXI.Graphics();
			this.dom.addChildAt(this.$bg_color_dom, 0);
			this.widthChanged.connect(this, this.$reDrawBG);
			this.heightChanged.connect(this, this.$reDrawBG);
		}
		this.$reDrawBG();
	}
	$onSetRepeat(newVal) {
		let repeat_x,
			repeat_y;
		if (newVal instanceof Array) {
			[repeat_x, repeat_y] = newVal;
		} else {
			repeat_x = repeat_y = newVal;
		}
		repeat_x = !!repeat_x;
		repeat_y = !!repeat_y;
		let changed = false;
		if (repeat_x !== this.$repeat_x) {
			this.$repeat_x = repeat_x;
			changed = true;
		}
		if (repeat_y !== this.$repeat_y) {
			this.$repeat_y = repeat_y;
			changed = true;
		}
		if (changed) {
			this.$reDrawWH()
		}
		return changed;
	}
	$onSourceChanged(newVal) {
		const $request = this.$request;
		$request.abort()
		$request.open('GET', newVal, true);
		$request.send();
	}
	$afterSourceChanged(texture) {
		this.$sprite.setTexture(texture);
		this.$onHtmlImageLoad(0, 1); // reset width height 
	}
	$onHtmlImageLoad(e, prevent_draw) {
		const $htmlImage = this.$htmlImage;
		const source = this.source;
		const {
			width,
			height
		} = $htmlImage;
		this.width = width;
		this.height = height;
		[
			["width", width],
			["height", height]
		].forEach(info => {
			const [key, newVal] = info
			const getter_key = `__${key}`;
			const oldVal = source[getter_key];
			if (oldVal !== newVal) {
				source[getter_key] = newVal;
				source.$properties[key].changed(newVal, oldVal, key)
			}
		});
		prevent_draw || this.$reDrawWH();
	}
	$reDrawTileWH() {
		debugger
		const $sprite = this.$sprite;
		const {
			width: paintedWidth,
			height: paintedHeight,
		} = this.painted;

		const {
			width: sourceWidth,
			height: sourceHeight,
		} = this.source;
		console.log(paintedWidth / sourceWidth, paintedHeight / sourceHeight)
		$sprite.tileScale.set(paintedWidth / sourceWidth, paintedHeight / sourceHeight);
	}
	$reDrawWH() {
		const $sprite = this.$sprite;
		const container = this.dom;
		const {
			width,
			height,
			$repeat_x,
			$repeat_y
		} = this;
		const spriteWidth = $repeat_x ? width : this.painted.width;
		const spriteHeight = $repeat_y ? height : this.painted.height;
		if (width < 0) {
			if (container.width > 0) {
				container.width = -container.width;
			}
			$sprite.width = -spriteWidth;
		} else {
			if (container.width < 0) {
				container.width = -container.width
			}
			$sprite.width = spriteWidth;
		}
		if (height < 0) {
			if (container.height > 0) {
				container.height = -container.height;
			}
			$sprite.height = -spriteHeight;
		} else {
			if (container.height < 0) {
				container.height = -container.height
			}
			$sprite.height = spriteHeight;
		}
	}
	get $src_ratio() {
		const baseTexture = this.$sprite.texture.baseTexture;
		return baseTexture.realWidth / baseTexture.realHeight;
	}
	get $cur_ratio() {
		return Math.abs(this.width / this.height);
	}
}

QmlWeb.registerPixiType({
	name: "Image",
}, Image);


Image.Stretch = 0; // (default)the image is scaled to fit
Image.PreserveAspectFit = 1; // the image is scaled uniformly to fit without cropping
Image.PreserveAspectCrop = 2; // the image is scaled uniformly to fill, cropping if necessary
Image.Tile = 3; // the image is duplicated horizontally and vertically
Image.TileVertically = 4; // the image is stretched horizontally and tiled vertically
Image.TileHorizontally = 5; // the image is stretched vertically and tiled horizontally
Image.Pad = 6; // the image is not transformed
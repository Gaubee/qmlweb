const FILLMODE_IMAGE_DRAW_CALC = [
	function() { // 0 
		const {
			width,
			height
		} = this;
		return {
			width,
			height,
			x: 0,
			y: 0
		}
	},
	[ // 1
		function() {
			const {
				width,
				height,
				$src_ratio
			} = this;
			const res_height = width / $src_ratio;
			return {
				x: 0,
				y: (height - res_height) / 2,
				width: width,
				height: res_height,
			}
		},
		function() {
			const {
				width,
				height,
				$src_ratio
			} = this;
			const res_width = height * $src_ratio;
			return {
				x: (width - res_width) / 2,
				y: 0,
				width: res_width,
				height: height,
			}
		}
	],
	[ // 2
		function() {
			const {
				width,
				height,
				$cur_ratio,
			} = this;

			const texture = this.$sprite.texture;
			const frame = texture.frame;
			const _bak_frame = texture._bak_frame || (texture._bak_frame = frame.clone());
			const frame_width = _bak_frame.width;
			const frame_height = _bak_frame.height;
			const res_frame_width = frame_height * $cur_ratio;
			frame.width = res_frame_width;
			frame.x = (frame_width - res_frame_width) / 2;
			texture._updateUvs();
			return {
				x: 0,
				y: 0,
				width: width,
				height: height,
			}
		},
		function() {
			const {
				width,
				height,
				$cur_ratio,
			} = this;

			const texture = this.$sprite.texture;
			const frame = texture.frame;
			const bak_frame = texture._bak_frame || (texture._bak_frame = frame.clone());
			const frame_width = bak_frame.width;
			const frame_height = bak_frame.height;
			const res_frame_height = frame_width / $cur_ratio;
			frame.height = res_frame_height;
			frame.y = (frame_height - res_frame_height) / 2;
			texture._updateUvs();
			return {
				x: 0,
				y: 0,
				width: width,
				height: height,
			}
		}
	]
];

class Image extends Container {
	constructor(meta) {
		super(meta);
		QmlWeb.createProperties(this, {
			paintedHeight: "real",
			paintedWidth: "real",
			progress: "real",
			source: "url",
			fillMode: "enum"
		});
		const $htmlImage = this.$htmlImage = document.createElement("img");
		const $sprite = this.$sprite = PIXI.Sprite.from($htmlImage);
		this.dom.addChild($sprite);

		console.log(this.width, this.$properties.width)
		this.$properties.width.setter = function setter(newVal) {
			console.log('width changed', newVal);
			this.val = newVal
		}

		const LifecycleKeys = [
			"progress",
			"loadstart",
			"loadend",
			"load",
			"error",
		]
		const PixiLifecycle = this.Lifecycle;
		LifecycleKeys.forEach(signal_key => {
			QmlWeb.delayInitProperty(PixiLifecycle, signal_key, (obj, signal_key) => {
				const signal = new Signal([], {
					obj: this
				})
				switch (signal_key) {
					default: $htmlImage.addEventListener(signal_key, signal.signal);
				}
				return signal;
			});
		});

		this.sourceChanged.connect(this, this.$onSourceChanged);
		this.widthChanged.connect(this, this.$reDrawWH);
		this.heightChanged.connect(this, this.$reDrawWH);
		this.fillModeChanged.connect(this, this.$onFillModeChanged);
		this.$getImgWH = FILLMODE_IMAGE_DRAW_CALC[0];

	}
	$onSourceChanged(newVal) {
		console.log('src changed', newVal);
		this.$htmlImage.src = newVal;
		const texture = PIXI.Texture.from(this.$htmlImage);
		this.$sprite.setTexture(texture);
		if (texture.baseTexture.hasLoaded) {
			this.$afterSourceChanged();
		} else {
			texture.baseTexture.once("loaded", this.$afterSourceChanged.bind(this))
		}
	}
	$afterSourceChanged() {
		this.$onHtmlImageLoad(0, 1); // reset width height 
		this.$getImgWH = null; // force reDraw
		this.$onFillModeChanged(); // reset $getImgWH and reDraw 
	}
	$onHtmlImageLoad(e, prevent_draw) {
		console.log("load");
		const $htmlImage = this.$htmlImage;
		this.paintedWidth = this.width = $htmlImage.width;
		this.paintedHeight = this.height = $htmlImage.height;
		prevent_draw || this.$reDrawWH();
	}
	$onHtmlImageProgress(e) {
		console.log("progress")
	}
	$reDrawWH() {
		const $sprite = this.$sprite;
		const container = this.dom;
		const {
			x,
			y,
			width,
			height,
		} = this.$getImgWH()
		$sprite.position.set(x, y);
		if (width < 0) {
			if (container.width > 0) {
				container.width = -container.width;
			}
			$sprite.width = -width;
		} else {
			if (container.width < 0) {
				container.width = -container.width
			}
			$sprite.width = width;
		}
		if (height < 0) {
			if (container.height > 0) {
				container.height = -container.height;
			}
			$sprite.height = -height;
		} else {
			if (container.height < 0) {
				container.height = -container.height
			}
			$sprite.height = height;
		}
	}
	get $src_ratio() {
		const baseTexture = this.$sprite.texture.baseTexture;
		return baseTexture.realWidth / baseTexture.realHeight;
	}
	get $cur_ratio() {
		return Math.abs(this.width / this.height);
	}
	$onFillModeChanged(newVal, oldVal, name) {
		const $sprite = this.$sprite;
		const texture = $sprite.texture;
		if (name === "fillMode") {
			if (oldVal === 2) { // PreserveAspectCrop
				const frame = texture.frame;
				const _bak_frame = texture._bak_frame;
				if (_bak_frame) {
					frame.copy(_bak_frame);
					texture._updateUvs();
				}
			}
		}
		const currentFillMode = this.fillMode;
		let $getImgWH;
		switch (currentFillMode) {
			case 0:
				$getImgWH = FILLMODE_IMAGE_DRAW_CALC[0]
				break;
			case 1: // PreserveAspectFit
			case 2: // PreserveAspectCrop
				if (this.$src_ratio > this.$cur_ratio) {
					$getImgWH = FILLMODE_IMAGE_DRAW_CALC[currentFillMode][0]
				} else {
					$getImgWH = FILLMODE_IMAGE_DRAW_CALC[currentFillMode][1]
				}
				break;
			case 3:
				break;
			case 4:
				break;
			case 5:
				break;
			case 6:
				break;
			default:
				throw new TypeError("Error fillMode:", currentFillMode)
		}
		if ($getImgWH && this.$getImgWH !== $getImgWH) {
			this.$getImgWH = $getImgWH;
			this.$reDrawWH();
		}
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
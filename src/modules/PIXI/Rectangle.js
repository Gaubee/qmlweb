class Rectangle extends Graphics {
	constructor(meta) {
		super(meta);
		this.color = "#FFFFFF";
		this.border = new QmlWeb.QObject(this);
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
		QmlWeb.createProperties(this, {
			radius: "real",
			radiusTopLeft: "real",
			radiusTopRight: "real",
			radiusBottomLeft: "real",
			radiusBottomRight: "real",
		});

		this.border.widthChanged.connect(this, this.$reDrawWH);
		this.border.colorChanged.connect(this, this.$reDrawWH);
		this.colorChanged.connect(this, this.$reDrawWH);
		this.widthChanged.connect(this, this.$reDrawWH);
		this.heightChanged.connect(this, this.$reDrawWH);

		this.leftChanged.connect(this, this.$reDrawXY);
		this.topChanged.connect(this, this.$reDrawXY);
		this.rightChanged.connect(this, this.$reDrawXYWithWH);
		this.bottomChanged.connect(this, this.$reDrawXYWithWH);
	}
	$reDrawWH() {
		this.$resetRB();
		QmlWeb.nextTickWithId(() => {
			const width = this.width;
			const height = this.height;
			const min_size = Math.min(width, height);
			// console.log('width:', width, 'height:', height)
			const graphics = this.dom;
			graphics.clear();
			graphics.lineStyle(0, 0, 0);
			const border = this.border;
			const border_width = border.width;
			const border_color = border.color;
			const double_border_width = border_width + border_width;

			graphics.beginFill(border_color.$number, border_color.$a);
			if (border_width > min_size / 2) {
				graphics.drawRect(0, 0, width, height);
				graphics.endFill();
			} else {
				// Draw Border
				graphics.drawRect(0, 0, width, border_width); //top
				graphics.drawRect(0, height - border_width, width, border_width); //bottom
				graphics.drawRect(0, border_width, border_width, height - double_border_width); //left
				graphics.drawRect(width - border_width, border_width, border_width, height - double_border_width); //right

				graphics.endFill();
				// Draw Body
				const color = this.color;
				graphics.beginFill(color.$number, color.$a);
				graphics.drawRect(border_width, border_width, width - double_border_width, height - double_border_width);
				graphics.endFill();
			}
		}, `${this.$uid}|reDrawWH`);
	}
	$reDrawXY() {
		this.$resetRB();
		QmlWeb.nextTickWithId(() => {
			// console.log('left:', this.left, 'top:', this.top)
			this.dom.position.set(this.left, this.top);
		}, `${this.$uid}|reDrawXY`);
	}
	$reDrawXYWithWH() {
		// this.$resetRB();
		// QmlWeb.nextTickWithId(() => {
		// 	console.log('left:', this.left, 'top:', this.top, 'width:', this.width, 'height:', this.height)
		// 	this.dom.position.set(this.left - this.width, this.top - this.height);
		// }, `${this.$uid}|reDrawXYWithWH`);
	}
	$resetRB() {
		// this.right = this.left + this.width;
		// this.bottom = this.top + this.height;
	}
}
QmlWeb.registerPixiType({
	name: "Rectangle",
}, Rectangle);
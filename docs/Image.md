# 图片元素 Image

为了尽可能降低学习成本和使用便利性（更贴近直观的思维），Image元素决定不以兼容Qt的标准，而是参考了CSS的background标准。
在Qt标准中，图形的显示行为被归纳到fillMode一个属性中，并用其它一些属性来进一步刻画出这个图形的具体显示行为。将这些属性打散重新设计，并糅合CSS的background标准于PIXI的API，得出一套新的容易学习并保持灵活与强壮的规范。

## Properties

* src : Url(TODO: | Source) : 图片源(TODO: 可以定义加载中的占位显示图片、不同设备像素比的图片源)，由于PIXI的限制，不支持GIF，但是支持视频格式（音频不自动播放）的资源，注意，由于基于canvas，所以必须时同源。
* color : Color : 背景底色，默认为透明，不过在最佳实践中Image往往回合Rectangle等形状元素一起使用。
* repeat : Boolean | [Boolean, Boolean] 设定X、Y方向的图片是否平铺显示。
* position : Position : 图片的起点坐标，和repeat属性配合使用，图片会以设定的坐标为平铺起点。否则效果与anchors.marginLeft/Top类似。
* source.url : Url : 只读，实际显示中的图片链接
* source.width : Number : 只读，图片的真实宽度
* source.height : Number : 只读，图片的真实高度
* source.ratio : Number : 只读，图片的宽高比
* width : Number : 元素的宽度
* height : Number : 元素的高度
* painted.width : Number : 单位图片（从图片起点到完整图片绘制的终点）的宽度，默认返回width
* painted.height : Number : 单位图片的高度，默认返回height
* painted.ratio : Number : 只读，单位图片宽高比
* progress : Number : 图片加载的进度0~1

## Methods

* .abort() : 终止资源加载

## Events

* onInit : 组件初始化时触发
* onLoadstart : 在资源开始加载的时候触发
* onLoadend : 在资源终止加载的时候触发，比如error、load、abort等情况
* onLoad : 在资源成功加载并渲染的时候触发
* onAbort: 在资源加载被中断的时候触发
* onError: 在资源加载出错的时候触发
* onProgress : 同onProgressChanged监听progress属性的变动
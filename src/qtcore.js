/* @license

  Copyright (c) 2011 Lauri Paimen <lauri@paimen.info>
 
  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions
  are met:

      * Redistributions of source code must retain the above
        copyright notice, this list of conditions and the following
        disclaimer.

      * Redistributions in binary form must reproduce the above
        copyright notice, this list of conditions and the following
        disclaimer in the documentation and/or other materials
        provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
  OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
  THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
  SUCH DAMAGE.
*/


/*
 * QML engine and elements.
 * 
 * This is the main component of the project. It defines qml engine, elements
 * and helpers for each.
 *
 * Exports:
 *
 * - QMLEngine(element, options) -- Returns new qml engine object, for which:
 *   - loadFile(file) -- Load file to the engine (.qml or .qml.js atm)
 *   - start() -- start the engine/application
 *   - stop() -- stop the engine/application. Restarting is experimental.
 *   element is HTMLCanvasElement and options are for debugging.
 *   For further reference, see testpad and qml viewer applications.
 */

(function() {

var QMLGlobalObject = {
    Qt: {
        rgba: function(r,g,b,a) {
            var rgba = "rgba("
                + Math.round(r * 255) + ","
                + Math.round(g * 255) + ","
                + Math.round(b * 255) + ","
                + Math.round(a * 255) + ")"
            return rgba },
        // Buttons masks
        LeftButton: 1,
        RightButton: 2,
        MiddleButton: 4,
        // Modifiers masks
        NoModifier: 0,
        ShiftModifier: 1,
        ControlModifier: 2,
        AltModifier: 4,
        MetaModifier: 8,
        KeypadModifier: 16 // Note: Not available in web

        }
    },
    // Simple shortcuts to getter & setter functions, coolness with minifier
    GETTER = "__defineGetter__",
    SETTER = "__defineSetter__",
    Undefined = undefined;

//Object.prototype[GETTER] = function(){};    

/**
 * Inheritance helper
 */
Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
};

// Helper. Ought to do absolutely nothing.
function noop(){};

// Helper to prevent some minimization cases. Ought to do "nothing".
function tilt() {arguments.length = 0};

// Helper to clone meta-objects for dynamic element creation
function cloneObject(obj) {
    if (null == obj || typeof obj != "object")
        return obj;
    var copy = new obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            if (typeof obj[attr] == "object")
                copy[attr] = cloneObject(obj[attr]);
            else
                copy[attr] = obj[attr];
        }
    }
    return copy;
}

/**
 * Helper function.
 * Prints msg and values of object. Workaround when using getter functions as
 * Chrome (at least) won't show property values for them.
 * @param {String} msg Message
 * @param {Object} obj Object to use (will be "printed", too)
 * @param {Array} vals Values to list from the object.
 */
function descr(msg, obj, vals) {
    var str = msg + ": [" + obj.id + "] ",
        i;
    for (i = 0; i < vals.length; i++) {
        str += vals[i] + "=" + obj[vals[i]] + " ";
    }
    console.log(str, obj);
}

/**
 * QMLTransientValue.
 * Value for setter can be given with this function.
 * The difference is that no change signal is fired for setting the value.
 * @param {any} val Value to be passed.
 * @return {QMLTransientValue} special value for 
 */
function QMLTransientValue(val) {
    this.$val = val;
}

/**
 * Evaluate binding.
 * @param {Object} thisObj Object to be this
 * @param {String} src Source code
 * @param {Object} objectScope Scope for evaluation
 * @param {Object} [globalScope] A second Scope for evaluation (both scopes properties will be directly accessible)
 * @return {any} Resulting object.
 */
function evalBinding(thisObj, src, objectScope, globalScope) {
    var val;
    // If "with" operator gets deprecated, you just have to create var of
    // every property in objectScope and globalScope, assign the values, and run. That'll be quite
    // slow :P
    // todo: use thisObj.
    //console.log("evalBinding objectScope, this, src: ", objectScope, thisObj, src);
    (function() {
        with(objectScope) {
            if (globalScope) {
                with (globalScope) {
                    val = eval(src);
                }
            } else {
                val = eval(src);
            }
        }
    })();
    //console.log("    ->", val);
    return val;
}

/**
 * QML Object constructor.
 * @param {Object} meta Meta information about the object
 * @param {Object} parent Parent object for new object
 * @return {Object} New qml object
 */
function construct(meta, parent, engine) {
    var constructors = {
            MouseArea: QMLMouseArea,
            Image: QMLImage,
            Item: QMLItemF,
            Column: QMLItem, // todo
            Row: QMLItem, // todo
            Display: QMLItem, // todo
            Text: QMLText,
            Rectangle: QMLRectangle,
            Repeater: QMLRepeater,
            QMLDocument: QMLDocument,
            Timer: QMLTimer,
            SequentialAnimation: QMLSequentialAnimation,
            NumberAnimation: QMLNumberAnimation
        },
        item;
        
    if (meta.$class in constructors) {
        item = constructors[meta.$class](meta, parent, engine);
        item.$$type = meta.$class; // Some debug info, don't depend on existence
        item.$$meta = meta; // Some debug info, don't depend on existence
        return item;
    } else if (cTree = engine.loadComponent(meta.$class)) {
        var component = construct(cTree, {}, engine);
        component.$children[0].$internChildren = component.$children[0].$children;
        if (component.$children[0].$defaultProperty)
            createSimpleProperty(component.$children[0], "$children", component.$children[0].$defaultProperty)
        meta.$component=component.$children[0];
        item = constructors[component.$children[0].$$type](meta, parent, engine);
        item.$$type = meta.$class; // Some debug info, don't depend on existence
        item.$$meta = meta; // Some debug info, don't depend on existence
        return item;
    } else {
        console.log("No constructor found for " + meta.$class);
    }

}

/**
 * Create property getters and setters for object.
 * @param {Object} obj Object for which gsetters will be set
 * @param {String} propName Property name
 * @param {any} defVal Value. If function, creates binding with defVal.code.
 * @param {Object} [altParent] Alternative parent. Defined function scope.
 */
function createSimpleProperty(obj, propName, defVal, altParent) {
    var changeFuncName = 'on'
                        + propName[0].toUpperCase()
                        + propName.substr(1)
                        + 'Changed',
        binding,
        objectScope = altParent || obj,
        componentScope = objectScope.Component.$scope.getIdScope();

    // Extended changesignal capabilities
    obj["$" + changeFuncName] = [];

    // Define getter
    function getter() {
        if (binding) {
            return binding();
        }
        if (defVal instanceof QMLBinding) {
            // todo: enable thisobj
            return evalBinding(null, defVal.src, objectScope, componentScope);
        } else {
            return defVal;
        }
    };
    
    // Define setter
    function setter(newVal) {
        var i;
        //console.log("set", obj.id || obj, propName, newVal);
        if (newVal instanceof QMLTransientValue) {
            // TransientValue, don't fire signal handlers
            defVal = newVal.$val;
            binding = false;
        } else if(newVal instanceof QMLBinding) {
            var bindSrc = "function $Qbc() { var $Qbv = " + newVal.src
                + "; return $Qbv;};$Qbc";
            binding = evalBinding(null, bindSrc, objectScope, componentScope);

        } else {
            binding = false;

            defVal = newVal;

            if (obj[changeFuncName]) {
                // Launch onPropertyChanged signal handler
                // (reading it is enough)
                evalBinding( null,
                            obj[changeFuncName].src,
                            objectScope, componentScope );
            }
            
            // Trigger extended changesignal capabilities
            for (i in obj["$" + changeFuncName]) {
                obj["$" + changeFuncName][i](obj[propName], obj, propName);
            }
        }
    };
    
    setupGetterSetter(obj, propName, getter, setter);
}

/**
 * Set up simple getter function for property
 */
var setupGetter,
    setupSetter,
    setupGetterSetter;
(function() {

// todo: What's wrong with Object.defineProperty on some browsers?
// Object.defineProperty is the standard way to setup getters and setters.
// However, the following way to use Object.defineProperty don't work on some
// webkit-based browsers, namely Safari, iPad, iPhone and Nokia N9 browser.
// Chrome, firefox and opera still digest them fine.

// So, if the deprecated __defineGetter__ is available, use those, and if not
// use the standard Object.defineProperty (IE for example).

    var useDefineProperty = !(Object[GETTER] && Object[SETTER]);

    if (useDefineProperty) {

        if (!Object.defineProperty) {
            console.log("No __defineGetter__ or defineProperty available!");
        }

        setupGetter = function(obj, propName, func) {
            Object.defineProperty(obj, propName,
                { get: func, configurable: true, enumerable: true } );
        }
        setupSetter = function(obj, propName, func) {
            Object.defineProperty(obj, propName,
                { set: func, configurable: true, enumerable: false });
        }
        setupGetterSetter = function(obj, propName, getter, setter) {
            Object.defineProperty(obj, propName,
                {get: getter, set: setter, configurable: true, enumerable: false });
        }
    } else {
        setupGetter = function(obj, propName, func) {
            obj[GETTER](propName, func);
        }
        setupSetter = function(obj, propName, func) {
            obj[SETTER](propName, func);
        }
        setupGetterSetter = function(obj, propName, getter, setter) {
            obj[GETTER](propName, getter);
            obj[SETTER](propName, setter);
        }
    }

})();
/**
 * Apply properties from meta to item. Skip values in skip.
 * @param {Object} meta Source of properties
 * @param {Object} item Target of property apply
 * @param {Array} [skip] Array of property names to skip
 */
function applyProperties(meta, item, skip) {
    var i;
    skip = skip || [];
    for (i in meta) {
        // skip if required
        if (skip.indexOf(i) != -1) {
            continue;
        }
        // skip global id's and internal values
        if (i == "id" || i == "anchors" || i[0] == "$") {
            continue;
        }
        // no property should begin with uppercase letter -- those indicate
        // classes
        if (i[0] == i[0].toUpperCase()) {
            console.log(meta, "has", i, "-- bug?");
            continue;
        }
        // Handle objects which are already defined in item differently
        if (Object.prototype.toString.call(meta[i]) == '[object Object]') {
            if (item[i] && !(meta[i] instanceof QMLBinding)) {
                // Apply properties one by one, otherwise apply at once
                // skip nothing
                applyProperties(meta[i], item[i]);
                continue;
            }
        }
        item[i] = meta[i];
    }
}

// ItemModel. EXPORTED.
JSItemModel = function() {
    this.dataChangedCallbacks = [];
    this.rowsInsertedCallbacks = [];
    this.rowsMovedCallbacks = [];
    this.rowsRemovedCallbacks = [];
    this.modelResetCallbacks = [];
    this.roleNames = [];

    this.setRoleNames = function(names) {
        this.roleNames = names;
    }

    this.emitDataChanged = function(startIndex, endIndex) {
        for (var i in this.dataChangedCallbacks) {
            this.dataChangedCallbacks[i](startIndex, endIndex);
        }
    }
    this.emitRowsInserted = function(startIndex, endIndex) {
        for (var i in this.rowsInsertedCallbacks) {
            this.rowsInsertedCallbacks[i](startIndex, endIndex);
        }
    };
    this.emitRowsMoved = function(sourceStartIndex, sourceEndIndex, destinationIndex) {
        for (var i in this.rowsMovedCallbacks) {
            this.rowsMovedCallbacks[i](sourceStartIndex, sourceEndIndex, destinationIndex);
        }
    };
    this.emitRowsRemoved = function(startIndex, endIndex) {
        for (var i in this.rowsRemovedCallbacks) {
            this.rowsRemovedCallbacks[i](startIndex, endIndex);
        }
    };
    this.emitModelReset = function() {
        for (var i in this.modelResetCallbacks) {
            this.modelResetCallbacks[i]();
        }
    };

    return this;
}

// -----------------------------------------------------------------------------
// Stuff below defines QML things
// -----------------------------------------------------------------------------

// Helper
function unboundMethod() {
    console.log("Unbound method for", this.$$type, this);
}

// QML engine. EXPORTED.
QMLEngine = function (element, options) {
    var // Engine itself
        eng = {},
        // Target canvas
        canvas = element.getContext('2d'),
        // Global Qt object
        globalObj = Object.create(QMLGlobalObject),
        // Root document of the engine
        doc,
        // Callbacks for stopping or starting the engine
        whenStop = [],
        whenStart = [],
        // Ticker resource id and ticker callbacks
        tickerId,
        tickers = [],
        lastTick = new Date().getTime(),
        // isDirty tells if we should do redraw
        isDirty = true,
        // Base path of qml engine (used for resource loading)
        basePath,
        i;
    
    options = options || {};

    if (options.debugConsole) {
        // Replace QML-side console.log
        globalObj.console = {};
        globalObj.console.log = function() {
            var args = Array.prototype.slice.call(arguments);
            options.debugConsole.apply(Undefined, args);
        };
    }

    eng.mouseAreas = [];
    // Register mousehandler for element
    element.onclick = function(e) {
        if (eng.running) {
            var i;
            for (i in eng.mouseAreas) {
                var l = eng.mouseAreas[i];
                var mouse = {
                    accepted: true,
                    button: e.button == 0 ? l.Qt.LeftButton :
                            e.button == 1 ? l.Qt.RightButton :
                            e.button == 2 ? l.Qt.MiddleButton :
                            0,
                    modifiers: (e.ctrlKey * l.Qt.CtrlModifier)
                            | (e.altKey * l.Qt.AltModifier)
                            | (e.shiftKey * l.Qt.ShiftModifier)
                            | (e.metaKey * l.Qt.MetaModifier),
                    x: (e.offsetX || e.layerX) - l.left,
                    y: (e.offsetY || e.layerY) - l.top
                };

                if (l.enabled
                && mouse.x >= 0 // equals: e.offsetX >= l.left
                && (e.offsetX || e.layerX) <= l.right
                && mouse.y >= 0 // equals: e.offsetY >= l.top
                && (e.offsetY || e.layerY) <= l.bottom) {
                    // Dispatch mouse event
                    l.mouse = mouse;
                    tilt(l.onClicked); // use tilt to prevent minimization
                    l.mouse = Undefined;
                    eng.$requestDraw();
                    break;
                }
            }
        }
    }

    // Listen also to touchstart events on supporting devices
    // Makes clicks more responsive (do not wait for click event anymore)
    function touchHandler(e) {
        // preventDefault also disables pinching and scrolling while touching
        // on qml application
        e.preventDefault();
        var at = {
            layerX: e.touches[0].pageX - element.offsetLeft,
            layerY: e.touches[0].pageY - element.offsetTop,
            button: 1
        }
        element.onclick(at);

    };

    eng.oldMousePos= {x:0, y:0};
    function mousemoveHandler(e) {
        for (i in eng.mouseAreas) {
            var l = eng.mouseAreas[i];
            if (l && l.onExited && l.hoverEnabled
                  && (eng.oldMousePos.x >= l.left
                      && eng.oldMousePos.x <= l.right
                      && eng.oldMousePos.y >= l.top
                      && eng.oldMousePos.y <= l.bottom)
                  && !(e.pageX - element.offsetLeft >= l.left
                       && e.pageX - element.offsetLeft <= l.right
                       && e.pageY - element.offsetTop >= l.top
                       && e.pageY - element.offsetTop <= l.bottom) ) 
                // We were hovering the Element before but aren't anymore
                // Method will be invoked from within the getter
                // tilt to prevent minimization
                tilt(l.onExited); 
        }
        for (i in eng.mouseAreas) {
            var l = eng.mouseAreas[i];
            if (l && l.onEntered && l.hoverEnabled
                  && (e.pageX - element.offsetLeft >= l.left
                      && e.pageX - element.offsetLeft <= l.right
                      && e.pageY - element.offsetTop >= l.top
                      && e.pageY - element.offsetTop <= l.bottom)
                  && !(eng.oldMousePos.x >= l.left
                       && eng.oldMousePos.x <= l.right
                       && eng.oldMousePos.y >= l.top
                       && eng.oldMousePos.y <= l.bottom))
                // We are now hovering the Element and weren't before
                // Method will be invoked from within the getter
                // tilt to prevent minimization
                tilt(l.onEntered); 
        }
        eng.oldMousePos = { x: e.pageX - element.offsetLeft,
                            y: e.pageY - element.offsetTop };
    }

    eng.running = false;

    eng.$getGlobalObj = function() { return globalObj; }

    eng.fps = 25;
    eng.$interval = Math.floor(1000 / eng.fps); // Math.floor, causes bugs to timing?

    eng.$getTextMetrics = function(text, fontCss) {
        canvas.save();
        canvas.font = fontCss;
        var metrics = canvas.measureText(text);
        canvas.restore();
        return metrics;
    }

    eng.$setBasePath = function(path) {
        basePath = path;
    }


    // List of available Components
    eng.components = {};
    // Load file, parse and construct as Component (.qml or .qml.js)
    eng.loadComponent = function(name) {
        if (name in eng.components)
            return eng.components[name];

        var file = name + ".qml";
        basePath = file.split("/");
        basePath[basePath.length - 1] = "";
        basePath = basePath.join("/");

        var src = getUrlContents(file);
        if (src=="")
            return undefined;
        var tree = parseQML(src);
        eng.components[name] = tree;
        return tree;
    }

    // Stack of Components/Files in whose context elements are being created.
    // Used to distribute the Component to all it's children without needing
    // to pass it through all constructors.
    // The last element in the Stack is the currently relevant context.
    eng.workingContext = [];
    // Load file, parse and construct (.qml or .qml.js)
    eng.loadFile = function(file) {
        basePath = file.split("/");
        basePath[basePath.length - 1] = "";
        basePath = basePath.join("/");

        var src = getUrlContents(file);
        if (options.debugSrc) {
            options.debugSrc(src);
        }
        this.loadQML(src);
    }
    // parse and construct qml
    eng.loadQML = function(src) {
        var tree = parseQML(src);
        if (options.debugTree) {
            options.debugTree(tree);
        }
        doc = construct(tree, {}, this);
    }
    
    // Return a path to load the file
    eng.$resolvePath = function(file) {
        if (file.indexOf("://") != -1) {
            return file;
        } else if (file.indexOf("/") == 0) {
            return file;
        }
        return basePath + file;
    }
    
    function tick() {
        var i,
            now = (new Date).getTime(),
            elapsed = now - lastTick;
        lastTick = now;
        for (i = 0; i < tickers.length; i++) {
            tickers[i](now, elapsed);
        }
        if (isDirty) {
            isDirty = false;
            eng.$draw();
        }
    }
    
    eng.$registerStart = function(f) {
        whenStart.push(f);
    }
    eng.$registerStop = function(f) {
        whenStop.push(f);
    }

    eng.$addTicker = function(t) {
        tickers.push(t);
    }
    eng.$removeTicker = function(t) {
        var index = tickers.indexOf(t);
        if (index != -1) {
            tickers.splice(index, 1);
        }
    }
    
    // Requests draw in case something has probably changed.
    eng.$requestDraw = function() {
        isDirty = true;
    }
    
    eng.$draw = function() {
        var time = new Date();

        element.height = doc.height;
        element.width = doc.width;

        // Pixel-perfect size
//        canvasEl.style.height = canvasEl.height + "px";
//        canvasEl.style.width = canvasEl.width + "px";

        doc.$draw(canvas);

        if (options.drawStat) {
            options.drawStat((new Date()).getTime() - time.getTime());
        }
    }

    eng.size = function() {
        return {width: doc.getWidth(), height: doc.getHeight()};
    }

    eng.start = function() {
        var i;
        if (!this.running) {
            element.addEventListener("touchstart", touchHandler);
            element.addEventListener("mousemove", mousemoveHandler);
            this.running = true;
            tickerId = setInterval(tick, this.$interval);
            for (i = 0; i < whenStart.length; i++) {
                whenStart[i]();
            }
            this.$draw();
        }
    }
    eng.stop = function() {
        var i;
        if (this.running) {
            element.removeEventListener("touchstart", touchHandler);
            element.removeEventListener("mousemove", mousemoveHandler);
            this.running = false;
            clearInterval(tickerId);
            for (i = 0; i < whenStop.length; i++) {
                whenStop[i]();
            }
        }
    }
    
    // Performance measurements
    eng.$perfDraw = function(canvas) {
        doc.$draw(canvas);
    }
    
    return eng;
}

// Base object for all qml thingies
function QMLBaseObject(meta, parent, engine) {
    var item = meta.$component || Object.create(engine.$getGlobalObj()),
        i,
        prop;

    item.$draw = noop;
    item.Component = engine.workingContext[engine.workingContext.length-1];
    item.$defaultProperty = meta.$defaultProperty;

    // parent
    item.parent = parent;
        
    // id
    if (meta.id) {
        item.id = meta.id;
        item.Component.$scope.defId(meta.id, item);
    }

    // properties
    if (meta.$properties) {
        for (i in meta.$properties) {
            prop = meta.$properties[i];
            if (prop.type == "alias") {
                // alias is reverse property, reverse getters and setters needed
                if (!(prop.value instanceof QMLBinding)) {
                    console.log("Assumption failed: alias was not binding");
                }
                console.log("Aliases not yet supported");
                /* Aliases are not yet supported.
                Following code has never been executed.
                Left here for reference.
                            
                item[GETTER](i, function() {
                    return evalBinding(null, prop.value.src, this);
                });
                item[SETTER](i, function(val) {
                    // val needs to be assigned to property/object/thingie
                    // pointed by value.
                    // todo: not sure how to do this by-the-book.

                    // Way 1:
                    // Inject value-to-be-assigned to scope and alter the
                    // binding to assign the value. Then evaluate. Dirty hack?
                    var scope = this,
                        assignment = "(" + prop.value.src  + ") = $$$val";
                    scope.$$$val = val;
                    evalBinding(null, assignment, scope);

                    // Way 2:
                    // Evaluate binding to get the target object, then simply
                    // assign. Didn't choose this as I'm afraid it wont work for
                    // primitives.
                    // var a = evalBinding(null,
                    //                      prop.value.src, scope);
                    // a = val;
                    //

                    });
                }
                */
            } else {
                createSimpleProperty(item, i, prop.value);
            }
        }
    }
    
    // todo: handle alias property assignments here?
    
    // methods
    function createMethod(item, name, method) {
        // Trick: evaluate method with bindings to get pointer to
        // function that can then be applied with arguments
        // given to this function to do the job (and get the return
        // values).
        var func = evalBinding(null,
                               method + ";" + name,
                               item,
                               item.Component.$scope.getIdScope());
        return function() {
            return func.apply(null, arguments);
        };
    }
    if (meta.$functions) {
        for (i in meta.$functions) {
            item[i] = createMethod(item, i, meta.$functions[i]);
        }
    }
    
    // signals
    if (meta.$signals) {
        for (i in meta.$signals) {
        
        }
    }

    // Construct from meta, not from this!
    if (!item.$children)
        item.$children = [];
    if (meta.$children) {
        for (i = 0; i < meta.$children.length; i++) {
            child = construct(meta.$children[i], item, engine);
            item.$children.push( child );
        }
    }

    return item;
}

// Item qml object
function QMLItem(meta, parent, engine) {
    var item = QMLBaseObject(meta, parent, engine),
        child,
        o, i;
    
    // Anchors. Gah!
    // Create anchors object
    item.anchors = {};

    function marginsSetter(val) {
        this.topMargin = val;
        this.bottomMargin = val;
        this.leftMargin = val;
        this.rightMargin = val;
    }
    setupSetter(item, 'margins', marginsSetter);

    // Assign values from meta
    if (meta.anchors) {
        for (i in meta.anchors) {
            createSimpleProperty(item.anchors, i, meta.anchors[i], item);
        }
    }

    // Define anchor getters, returning absolute position
    // left, right, top, bottom, horizontalCenter, verticalCenter, baseline
    // todo: margins
    function leftGetter() {
        var t;
        if ((t = this.anchors.left) !== Undefined) {
            return t;
        }
        if ((t = this.anchors.right) !== Undefined) {
            return t - this.$width;
        }
        if ((t = this.anchors.horizontalCenter) !== Undefined) {
            return t - this.$width / 2;
        }
        if ((t = this.anchors.fill) !== Undefined) {
            return t.left;
        }
        if ((t = this.anchors.centerIn) !== Undefined) {
            return t.horizontalCenter - this.$width / 2;
        }
        return this.x + parent.left;
    }
    //item[GETTER]("left", leftGetter);
    setupGetter(item, "left", leftGetter);
        
    function rightGetter() {
        return this.left + this.$width;
    }
    //item[GETTER]("right", rightGetter);
    setupGetter(item, "right", rightGetter);
    
    function topGetter() {
        var t;
        if ((t = this.anchors.top) !== Undefined) {
            return t;
        }
        if ((t = this.anchors.bottom) !== Undefined) {
            return t - this.$height;
        }
        if ((t = this.anchors.verticalCenter) !== Undefined) {
            return t - this.$height / 2;
        }
        if ((t = this.anchors.fill) !== Undefined) {
            return t.top;
        }
        if ((t = this.anchors.centerIn) !== Undefined) {
            return t.verticalCenter - this.$height / 2;
        }
        return this.y + parent.top;
    }
    //item[GETTER]("top", topGetter);
    setupGetter(item, "top", topGetter);
    
    function bottomGetter() {
        return this.top + this.$height;
    }
    //item[GETTER]("bottom", bottomGetter);
    setupGetter(item, "bottom", bottomGetter);
    
    function hzGetter() {
        return this.left + this.$width / 2;
    }
    //item[GETTER]("horizontalCenter", hzGetter);
    setupGetter(item, "horizontalCenter", hzGetter);
    
    function vzGetter() {
        return this.top + this.$height / 2;
    }
    //item[GETTER]("verticalCenter", vzGetter);
    setupGetter(item, "verticalCenter", vzGetter);
    
    function blGetter() {
        return this.top;
    }
    //item[GETTER]("baseline", blGetter);
    setupGetter(item, "baseline", blGetter);
    
    // Anchoring helpers; $width + $height => Object draw width + height
    function _widthGetter() {
        var t;
        if ((t = this.anchors.fill) !== Undefined) {
            return t.$width;
        };
        return this.implicitWidth || this.width;
    }
    //item[GETTER]("$width", _widthGetter);
    setupGetter(item, "$width", _widthGetter);
    function _heightGetter() {
            var t;
            if ((t = this.anchors.fill) !== Undefined) {
                return t.$height;
            };
            return this.implicitHeight || this.height;
    }
    //item[GETTER]("$height", _heightGetter);
    setupGetter(item, "$height", _heightGetter);
    
    createSimpleProperty(item, "height", 0);
    createSimpleProperty(item, "implicitWidth", 0);
    createSimpleProperty(item, "implicitHeight", 0);
    createSimpleProperty(item, "rotation", 0);
    createSimpleProperty(item, "spacing", 0);
    createSimpleProperty(item, "visible", true);
    createSimpleProperty(item, "width", 0);
    createSimpleProperty(item, "x", 0);
    createSimpleProperty(item, "y", 0);
    createSimpleProperty(item, "z", 0);
        
    item.$draw = function(c) {
        var i;
        if (this.visible) {
            if (this.$drawItem ) {
                var rotRad = (this.rotation || 0) / 180 * Math.PI,
                    rotOffsetX = Math.sin(rotRad) * item.$width,
                    rotOffsetY = Math.sin(rotRad) * item.$height;
                c.save();

                // Handle rotation
                // todo: implement transformOrigin
                c.translate(this.left + rotOffsetX, this.top + rotOffsetY);
                c.rotate(rotRad);
                c.translate(-this.left, -this.top);
                // Leave offset for drawing...
                this.$drawItem(c);
                c.translate(-rotOffsetX, -rotOffsetY);
                c.restore();
            }
            if (this.$internChildren != undefined) {
                for (i = 0; i < this.$internChildren.length; i++) {
                    if (this.$internChildren[i]
                        && this.$internChildren[i].$draw) {
                        this.$internChildren[i].$draw(c);
                    }
                }
            } else {
                for (i = 0; i < this.$children.length; i++) {
                    if (this.$children[i]
                        && this.$children[i].$draw) {
                        this.$children[i].$draw(c);
                    }
                }
            }
        }
    }
    
    return item;
}

// Quick hack; final instance of qml item
// Remove hack by applying properties in constructor itself rather than in
// builder classes
function QMLItemF(meta, parent, engine) {
    var item = QMLItem(meta, parent, engine);
    applyProperties(meta, item);
    return item;
}

function QMLText(meta, parent, engine) {
    var item = QMLItem(meta, parent, engine);

    // Creates font css description
    function fontCss(font) {
        var css = "";
        font = font || {};
        css += (font.pointSize || 10) + "pt ";
        css += (font.family || "sans-serif") + " ";
        return css;
    }

    createSimpleProperty(item, "color", "black");

    createSimpleProperty(item, "text", "");

    // Define implicitHeight & implicitWidth

    // Optimization: Remember last text
    // todo: Check for font size, family also
    var lastHText,
        lastH;
    function ihGetter(){
        // There is no height available in canvas element, figure out
        // other way
        if (lastHText == this.text) {
            return lastH;
        }
        var el = document.createElement("span"),
            height;
        el.style.font = fontCss(this.font);
        el.innerText = this.text;
        document.body.appendChild(el);
        height = el.offsetHeight;
        document.body.removeChild(el);
        if (!height) {
            // Firefox doesn't support getting the height this way,
            // approximate from point size (full of win) :P
            if (this.font && this.font.pointSize) {
                height = this.font.pointSize * 96 / 72;
            } else {
                height = 10 * 96 / 72;
            }
        
        }
        lastHText = this.text;
        lastH = height;
        return height;
    }
    //item[GETTER]("implicitHeight", ihGetter);
    setupGetter(item, "implicitHeight", ihGetter);
    
    // Optimization: Remember last text
    // todo: Check for font size, family also
    var lastWText,
        lastW;
    function iwGetter() {
        if (lastWText == this.text) {
            return lastW;
        }
        
        var width;
        width = engine.$getTextMetrics(this.text, fontCss(this.font)).width;
        lastWText = this.text;
        lastW = width;
        return width;
    }
    //item[GETTER]("implicitWidth", iwGetter);
    setupGetter(item, "implicitWidth", iwGetter);
    
    function widthGetter() {
        return this.implicitWidth;
    }
    //item[GETTER]("width", widthGetter);
    setupGetter(item, "width", widthGetter);
    
    function heightGetter() {
        return this.implicitHeight;
    }
    //item[GETTER]("height", heightGetter);
    setupGetter(item, "height", heightGetter);

    applyProperties(meta, item);

    item.$drawItem = function(c) {
        //descr("draw text", this, ["x", "y", "text",
        //                          "implicitWidth", "implicitHeight"]);
        c.save();
        c.font = fontCss(this.font);
        c.fillStyle = this.color;
        c.textAlign = "left";
        c.textBaseline = "top";
        c.fillText(this.text, this.left, this.top);
        c.restore();
    }

    return item;
}

function QMLRectangle(meta, parent, engine) {
    var item = QMLItem(meta, parent, engine);
    
    createSimpleProperty(item, "color", "white");
    item.border = {};
    createSimpleProperty(item.border, "color", "rgba(0,0,0,0)", item);
    createSimpleProperty(item.border, "width", 0, item);

    applyProperties(meta, item);

    item.$drawItem = function(c) {
        //descr("draw rect", this, ["x", "y", "width", "height", "color"]);
        //descr("draw rect.border", this.border, ["color", "width"]);
        
        c.save();
        c.fillStyle = item.color;
        c.fillRect(this.left, this.top, this.$width, this.$height);
        c.strokeStyle = this.border.color;
        c.lineWidth = this.border.width;
        c.strokeRect(this.left, this.top, this.$width, this.$height);
        c.restore();
    }

    return item;
}

function QMLRepeater(meta, parent, engine) {
    var item = QMLItem(meta, parent, engine);

    createSimpleProperty(item, "model", 0);
    createSimpleProperty(item, "count", 0);
    
    if (!item.$children)
        item.$children = [];
    if (meta.$children)
        var delegateMeta = meta.$children[0];
    else
        console.log("Can't create Repeater without delegate. \
                    Delegate property is not supported yet, use children.");

    applyProperties(meta, item);

    function applyChildProperties(child, index) {
        child.index = index;
        for (var i in item.model.roleNames) {
            var func = eval("var func = function() {\
                return item.model.data(child.index, \"" + item.model.roleNames[i] + "\");\
            }; func"); // eval needed in order to evaluate item.model.roleNames[i] now and not on function call
            Object.defineProperty(child, item.model.roleNames[i], {get: func, enumerable: true});
        }
        for (var i in child.$children)
            applyChildProperties(child.$children[i], index);
    }
    function insertChildren(startIndex, endIndex) {
        engine.workingContext.push(item.Component);
        for (var index = startIndex; index < endIndex; index++) {
            var newMeta = cloneObject(delegateMeta);
            newMeta.id = newMeta.id + index;
            var newItem = construct(newMeta, item, engine);
            applyChildProperties(newItem, index);
            item.$children.splice(index, 0, newItem);
        }
        engine.workingContext.pop();
        item.count = item.$children.length;
    }

    if (item.model instanceof JSItemModel) {

        item.model.dataChangedCallbacks.push(engine.$requestDraw);
        item.model.rowsInsertedCallbacks.push(insertChildren);
        item.model.rowsMovedCallbacks.push(function(sourceStartIndex, sourceEndIndex, destinationIndex) {
            var vals = item.$children.splice(sourceStartIndex, sourceEndIndex-sourceStartIndex);
            for (var i = 0; i < vals; i++) {
                item.$children.splice(destinationIndex + i, 0, vals[i]);
            }
            engine.$requestDraw();
        });
        item.model.rowsRemovedCallbacks.push(function(startIndex, endIndex) {
            item.$children.splice(startIndex, endIndex - startIndex);
            item.count = item.$children.length;
            engine.$requestDraw();
        });
        item.model.modelResetCallbacks.push(function() {
            item.$children.splice(0, item.$children.length);
            insertChildren(0, item.model.rowCount());
            engine.$requestDraw();
        });

        insertChildren(0, item.model.rowCount());
    } else if (typeof item.model == "number") {
        insertChildren(0, item.model);
    }

    item.$drawItem = function(c) {
        if (typeof item.model == "number") {
            item.$children.splice(0, item.$children.length);
            insertChildren(0, item.model);
        }
    }

    return item;
}

function QMLImage(meta, parent, engine) {
    var item = QMLItem(meta, parent, engine),
        img = new Image();    
    // Exports.
    item.Image = {
        // fillMode 
        Stretch: 1,
        PreserveAspectFit: 2,
        PreserveAspectCrop: 3,
        Tile: 4,
        TileVertically: 5,
        TileHorizontally: 6,
        // status
        Null: 1,
        Ready: 2,
        Loading: 3,
        Error: 4
        }

    // no-op properties
    createSimpleProperty(item, "asynchronous", true);
    createSimpleProperty(item, "cache", true);
    createSimpleProperty(item, "smooth", true);
    
    createSimpleProperty(item, "fillMode", item.Image.Stretch);
    createSimpleProperty(item, "mirror", false);
    createSimpleProperty(item, "progress", 0);
    createSimpleProperty(item, "source", "");
    createSimpleProperty(item, "status", item.Image.Null);
    
    // todo: should be bindable properties
    item.sourceSize = {height: 0, width: 0}

    // Actual size of image.
    // todo: bug; implicitWidth|height is not defined this way in docs
    function iwGetter() {
            return item.width || img.naturalWidth;
    }
    //item[GETTER]("implicitWidth", iwGetter);
    setupGetter(item, "implicitWidth", iwGetter);
    
    function ihGetter() {
        return item.height || img.naturalHeight;
    }
    //item[GETTER]("implicitHeight", ihGetter);
    setupGetter(item, "implicitHeight", ihGetter);

    // Bind status to img element
    img.onload = function() {
        item.progress = 1;
        item.status = item.Image.Ready;
        // todo: it is not right to set these
        item.sourceSize.width = img.naturalWidth;
        item.sourceSize.height = img.naturalHeight;
        engine.$requestDraw();
    }
    img.onerror = function() {
        item.status = item.Image.Error;
    }

    // Use extended changesignal capabilities to keep track of source
    item.$onSourceChanged.push(function(val) {
        item.progress = 0;
        item.status = item.Image.Loading;
        img.src = eng.$resolvePath(val);
    });


    applyProperties(meta, item);    
    
    item.$drawItem = function(c) {
        //descr("draw image", this, ["left", "top", "$width", "$height", "source"]);
        
        if (this.fillMode != this.Image.Stretch) {
            console.log("Images support only Image.Stretch fillMode currently");
        }
        if (this.status == item.Image.Ready) {
            c.save();
            c.drawImage(img, item.left, item.top, item.$width, item.$height);
            c.restore();
        } else {
            console.log("Waiting for image to load");
        }
    }
 
    return item;   
}

function QMLMouseArea(meta, parent, engine) {
    var item = QMLItem(meta, parent, engine);

    createSimpleProperty(item, "acceptedButtons", item.Qt.LeftButton);
    createSimpleProperty(item, "enabled", true);
    createSimpleProperty(item, "onClicked", Undefined);
    createSimpleProperty(item, "onEntered", Undefined);
    createSimpleProperty(item, "onExited", Undefined);
    createSimpleProperty(item, "hoverEnabled", false);

    applyProperties(meta, item);

    engine.mouseAreas.push(item);

    return item;
}

function QMLDocument(meta, parent, engine) {

    var doc,
        // The only item in this document
        item,
        // id's in this scope
        ids = Object.create(engine.$getGlobalObj());

    // todo: imports
    
    if (meta.$children.length != 1) {
        console.log("QMLDocument: children.length != 1");
    }

    // Build parent
    parent = {};
    parent.left = 0;
    parent.top = 0;

    Component = {};
    Component.$scope = {
        // Get scope
        get: function() {
            return ids;
        },
        // Get base/id scope
        getIdScope: function() {
            return ids;
        },
        // Define id
        defId: function(name, obj) {
            if (ids[name]) {
                console.log("QMLDocument: overriding " + name
                            + " with object", obj);
            }
            ids[name] = obj;
        }
    };
    engine.workingContext.push(Component);

    doc = QMLItem(meta, parent, engine);
    item = doc.$children[0];

    engine.workingContext.pop();

    function heightGetter() {
        return item.height; 
    }
    //doc[GETTER]("height", heightGetter);
    setupGetter(doc, "height", heightGetter);
    
    function widthGetter() {
        return item.width;
    }
    //doc[GETTER]("width", widthGetter);
    setupGetter(doc, "width", widthGetter);
    

    doc.$draw = function(c) {
        c.save();
        c.fillStyle = "pink";
        c.fillRect(0, 0, c.canvas.width, c.canvas.height);
        c.restore();
        item.$draw(c);
    }
    // todo: legacy. remove
    doc.draw = doc.$draw;
    doc.getHeight = function() { return doc.height };
    doc.getWidth = function() { return doc.width };
    
    return doc; // todo: return doc instead of item

}

function QMLTimer(meta, parent, engine) {
    var item = QMLBaseObject(meta, parent, engine),
        prevTrigger;
    
    createSimpleProperty(item, "interval", 1000);
    createSimpleProperty(item, "repeat", false);
    createSimpleProperty(item, "running", false);
    createSimpleProperty(item, "triggeredOnStart", false);
                         
    // Create trigger as simple property. Reading the property triggers
    // the function!
    createSimpleProperty(item, "onTriggered", Undefined);
                     
    applyProperties(meta, item);

    engine.$addTicker(ticker);
    function ticker(now, elapsed) {
        if (item.running) {
            if (now - prevTrigger >= item.interval) {
                prevTrigger = now;
                trigger();
            }
        }
    }

    item.start = function() {
        if (!this.running) {
            this.running = true;
            prevTrigger = (new Date).getTime();
            if (this.triggeredOnStart) {
                trigger();
            }
        }
    }
    item.stop = function() {
        if (this.running) {
            this.running = false;
        }
    }
    item.restart = function() {
        this.stop();
        this.start();
    }
    
    function trigger() {
        // Trigger item.
        // Use tilt to prevent minimization
        tilt(item.onTriggered);

        engine.$requestDraw();
    }
    
    engine.$registerStart(function() {
        if (item.running) {
            item.running = false; // toggled back by item.start();
            item.start();
        }
    });

    engine.$registerStop(function() {
        item.stop();
    });  

    return item;
}

function QMLAnimation(meta, parent, engine) {
    var item = QMLBaseObject(meta, parent, engine);
    
    // Exports
    item.Animation = {
        Infinite: -1
    };
    
    createSimpleProperty(item, "alwaysRunToEnd", false);
    createSimpleProperty(item, "loops", 1);
    createSimpleProperty(item, "paused", false);
    createSimpleProperty(item, "running", false);
    
    // Methods
    item.restart = function() {
        item.stop();
        item.start();
    };
    // To be overridden
    item.complete = unboundMethod;
    item.pause = unboundMethod;
    item.resume = unboundMethod;
    item.start = unboundMethod;
    item.stop = unboundMethod;
    
    return item;
}

function QMLSequentialAnimation(meta, parent, engine) {
    var item = QMLAnimation(meta, parent, engine),
        curIndex,
        passedLoops,
        i;
    
    function nextAnimation(proceed) {

        var anim;
        if (item.running && !proceed) {
            curIndex++;
            if (curIndex < item.$children.length) {
                anim = item.$children[curIndex];
                console.log("nextAnimation", item, curIndex, anim);
                descr("", anim, ["target"]);
                anim.from = anim.target[anim.property];
                anim.start();
            } else {
                passedLoops++;
                if (passedLoops >= item.loops) {
                    item.complete();
                } else {
                    curIndex = -1;
                    nextAnimation();
                }
            }
        }
    }

    for (i = 0; i < item.$children.length; i++) {
        item.$children[i].$onRunningChanged.push(nextAnimation);
    }
    // $children is already constructed,
    
    applyProperties(meta, item);
    
    
    item.start = function() {
        if (!item.running) {
            item.running = true;
            curIndex = -1;
            passedLoops = 0;
            nextAnimation();
        }
    }
    item.stop = function() {
        if (item.running) {
            item.running = false;
            if (curIndex < item.$children.length) {
                item.$children[curIndex].stop();
            }
        }
    }
    
    item.complete = function() {
        if (item.running) {
            if (curIndex < item.$children.length) {
                // Stop current animation
                item.$children[curIndex].stop();
            }
            item.running = false;
        }
    }
    
    engine.$registerStart(function() {
        if (item.running) {
            item.running = false; // toggled back by start();
            item.start();
        }
    });
    engine.$registerStop(function() {
        item.stop();
    });  

    return item;
};

function QMLPropertyAnimation(meta, parent, engine) {
    var item = QMLAnimation(meta, parent, engine);
    
    // Exports
    item.Easing = {
        Linear: 1,
        InOutCubic: 2
        // TODO: rest and support for them.
    };
    
    createSimpleProperty(item, "duration", 250);
    item.easing = {};
    createSimpleProperty(item.easing, "type", item.Easing.Linear, item);
    createSimpleProperty(item.easing, "amplitude", Undefined, item);
    createSimpleProperty(item.easing, "overshoot", Undefined, item);
    createSimpleProperty(item.easing, "period", Undefined, item);
    createSimpleProperty(item, "from", 0);
    createSimpleProperty(item, "properties", []);
    createSimpleProperty(item, "property", Undefined);
    createSimpleProperty(item, "target", Undefined);
    createSimpleProperty(item, "targets", []);
    createSimpleProperty(item, "to", 0);

    return item;
}

function QMLNumberAnimation(meta, parent, engine) {
    var item = QMLPropertyAnimation(meta, parent, engine),
        tickStart;
    
    
    applyProperties(meta, item);
    
    engine.$addTicker(ticker);

    function curve(place) {
        switch(item.easing.type) {
        
         case item.Easing.InOutCubic:
            // todo: better estimate
            return 0.5 + Math.sin(place*Math.PI - Math.PI / 2) / 2
         default:
            console.log("Unsupported animation type: ", item.easing.type);
         case item.Easing.Linear:
            return place;
        }
    }

    function ticker(now, elapsed) {
        if (item.running) {
            if (now > tickStart + item.duration) {
                item.complete();
            } else {
                var at = (now - tickStart) / item.duration,
                    value = curve(at) * (item.to - item.from) + item.from;
                item.target[item.property] = new QMLTransientValue(value);
                engine.$requestDraw();
            }

        }
    }
    
    // Methods
    item.start = function() {
        if (!item.running) {
            item.running = true;
            tickStart = (new Date).getTime();
        }
    }
    
    item.stop = function() {
        if (item.running) {
            item.running = false;
        }
    }

    item.complete = function() {
        if (item.running) {
            item.target[item.property] = item.to;
            item.stop();
            engine.$requestDraw();
        }
    }


    return item;
}

})();




























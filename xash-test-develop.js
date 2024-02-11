var statusElement = document.getElementById('status');
var progressElement = document.getElementById('progress');
var asyncDialog = document.getElementById('asyncDialog');
var myerrorbuf = ''
var myerrordate = new Date();
var mounted = false;
var gamedir = 'valve';
var moduleCount = 0;
var mem = 150;
var mfs;
var libprefix = '';
var zipSize;
var idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;


// make BrowserFS to work on ES5 browsers
if (!ArrayBuffer['isView']) {
  ArrayBuffer.isView = function(a) {
    return a !== null && typeof(a) === "object" && a['buffer'] instanceof ArrayBuffer;
  };
}
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position){
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

function prepareSelects()
{
  var len = zipMods.length;
  var select = document.getElementById('selectZip');
  if( len )
  {
    showElement('zipHider', true);

    if(len > 1)
    {
      var links = '';
      for(var i = 0; i < len; i++)
      {
        select.options[i] = new Option(zipMods[i][1], zipMods[i][0]);
        links += '<br><a href="'+zipMods[i][0]+'">'+zipMods[i][1]+'</a>';
      }
      select.style.display = 'block';
      document.getElementById('linksPlaceholder').innerHTML += links;
      showElement('linksPlaceholder', true);
    }
  }
  else
    document.getElementById('rZip').checked = false;
  len = aczMods.length;
  select = document.getElementById('selectACZip');
  if( len )
  {
    showElement('aczHider', true);

    if(len > 1)
    {
      for(var i = 0; i < len; i++)
      {
        select.options[i] = new Option(aczMods[i][1], aczMods[i][0]);
      }
      select.style.display = 'block';
    }
  }
  else
    document.getElementById('rACZip').checked = false;
  len = pkgMods.length;
  select = document.getElementById('selectPkg');
  if( len )
  {
    showElement('pkgHider', true);

    if(len > 1)
    {
      for(var i = 0; i < len; i++)
        select.options[i] = new Option(pkgMods[i][1], pkgMods[i][0]);
      select.style.display = 'block';
    }
  }
  else
    document.getElementById('rPackage').checked = false;

  loadHash();
  if( !zipMods.length && !len )
  {
    document.getElementById('rLocalZip').checked = true;
    showElement('rLocalZip', false);
  }
}

function loadHash()
{
  try
  {
    pageargs = parseHashBangArgs(document.location.hash);
  }
  catch(e){}
  switch(pageargs.src)
  {
    case 'zip':
      document.getElementById('rZip').checked = true;
      break;
    case 'ac':
      document.getElementById('rACZip').checked = true;
      break;
    case 'pkg':
      document.getElementById('rPackage').checked = true;
      break;
    case 'local':
      document.getElementById('rLocalZip').checked = true;
      break;
  }
  switch(pageargs.fs)
  {
    case 'idb':
      document.getElementById('rIndexedDB').checked = true;
      break;
    case 'ls':
      document.getElementById('rLocalStorage').checked = true;
      break;
    case 'none':
      document.getElementById('rNone').checked = true;
      break;
  }
  if( pageargs.pkg )
    for(var i = 0; i < pkgMods.length;i++)
      if( pkgMods[i][0] == pageargs.pkg )
        document.getElementById('selectPkg').selectedIndex = i; 
  if( pageargs.zip )
    for(var i = 0; i < zipMods.length;i++)
      if( zipMods[i][0] == pageargs.zip )
        document.getElementById('selectZip').selectedIndex = i; 
  if( pageargs.ac )
    for(var i = 0; i < aczMods.length;i++)
      if( aczMods[i][0] == pageargs.ac )
        document.getElementById('selectACZip').selectedIndex = i; 
  if( pageargs.cmd )
  {
    var args = pageargs.cmd.split(',');
    var str = args[0];
    for(var i = 1; i < args.length; i++)
      str = str + ' ' + args[i];
    document.getElementById('iArgs').value = str;
  }
  if( pageargs.libprefix )
    libprefix = pageargs.libprefix;
}

function parseHashBangArgs(aURL) {
  aURL = aURL || window.location.href;

  var vars = {};
  var hashes = aURL.slice(aURL.indexOf('#') + 1).split('&');

  for(var i = 0; i < hashes.length; i++) {
    var hash = hashes[i].split('=');

    if(hash.length > 1) {
      vars[hash[0]] = hash[1];
    } else {
      vars[hash[0]] = null;
    }
  }

  return vars;
}
var pageargs = [];

try
{
  pageargs = parseHashBangArgs();
  if ("onhashchange" in window)
    window.onhashchange = loadHash;
  if( pageargs.mem ) mem = parseInt(pageargs.mem);
}
catch(e){};

var Module = {
  TOTAL_MEMORY: mem * 1024 * 1024,
  preRun: [],
  postRun: [],
  print: (function() {
    var element = document.getElementById('output');
    if (element) element.value = ''; // clear browser cache
    return function(text) {
      if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
      // These replacements are necessary if you render to raw HTML
      //text = text.replace(/&/g, "&amp;");
      //text = text.replace(/</g, "&lt;");
      //text = text.replace(/>/g, "&gt;");
      //text = text.replace('\n', '<br>', 'g');
      //console.log(text);
      if(text)
        myerrorbuf += text + '\n';
      if (element) {
        if(element.value.length > 65536)
          element.value = element.value.substring(512) + myerrorbuf;
        else
          element.value += myerrorbuf;
        element.scrollTop = element.scrollHeight; // focus on bottom
      }
      myerrorbuf = ''
    };
  })(),
  printErr: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    if (0) { // XXX disabled for safety typeof dump == 'function') {
      dump(text + '\n'); // fast, straight to the real console
    } else {
      if( myerrorbuf.length > 2048 )
        myerrorbuf = 'some lines skipped\n'+ myerrorbuf.substring(512);
      myerrorbuf += text + '\n';
      if(  new Date() - myerrordate > 3000 )
      {
        myerrordate = new Date();
        Module.print();
      }
    }
  },
  canvas: (function() {
    var canvas = document.getElementById('canvas');

    // As a default initial behavior, pop up an alert when webgl context is lost. To make your
    // application robust, you may want to override this behavior before shipping!
    // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
    canvas.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);

    return canvas;
  })(),
  setStatus: function(text) {
    if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
    if (text === Module.setStatus.text) return;
    if(  new Date() - myerrordate > 3000 )
    {
      myerrordate = new Date();
      Module.print();
    }

    statusElement.innerHTML = text;
    if( progressElement )
    {
      var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);

      if(m)
      {
        var progress = Math.round(parseInt(m[2])*100/parseInt(m[4]));
        progressElement.style.color = progress > 5?'#303030':'#aaa000';
        progressElement.style.width = progressElement.innerHTML = ''+progress+'%';
      }
      showElement('progress1', !!m);
    }
  },
  totalDependencies: 0,
  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    if(left)
      Module.setStatus('Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')');
  }
};
window.onerror = function(event) {
  if(mounted)
    FS.syncfs(false, function(err){Module.print('Saving IDBFS: '+err);});
  if( (''+event).indexOf('SimulateInfiniteLoop') > 0 )
    return;
  var text = 'Exception thrown: ' + event;
  text = text.replace(/&/g, "&amp;");
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  text = text.replace('\n', '<br>', 'g');
  Module.setStatus(text);
  Module.print('Exception thrown: ' + event);
};

function haltRun()
{
}

var savedRun;

function radioChecked(id)
{
  var r = document.getElementById('r'+id);
  if(r) return r.checked;
  return false;
}

function showElement(id, show)
{
  var e = document.getElementById(id);
  if(!e) return;
  e.style.display=show?'block':'none';
}
Module.setStatus('Downloading...');

function savePageArgs()
{
  var val = document.getElementById('iArgs').value || ' ';
  var base_args = val.split(' ');
  pageargs.cmd = ''+base_args;
  if( radioChecked('Package') )
    pageargs.src = 'pkg';
  else if( radioChecked('Zip') )
    pageargs.src = 'zip';
  else if( radioChecked('ACZip') )
    pageargs.src = 'ac';
  else if( radioChecked('LocalZip') )
    pageargs.src = 'local';
  if( radioChecked( 'IndexedDB' ) )
    pageargs.fs = 'idb';
  else if( radioChecked( 'LocalStorage' ) )
    pageargs.fs = 'ls';
  else if( radioChecked( 'None' ) )
    pageargs.fs = 'none';
  try
  {
    pageargs.zip = zipMods.length>1?document.getElementById('selectZip').value:zipMods[0][0];
    pageargs.pkg = pkgMods.length>1?document.getElementById('selectPkg').value:pkgMods[0][0];
    pageargs.ac = aczMods.length>1?document.getElementById('selectACZip').value:aczMods[0][0];
  }
  catch(e){}
}
function saveHash()
{
  var str = '';
  for(arg in pageargs)
    if( pageargs[arg] )
      str += arg + '=' + pageargs[arg]+'&';
  str=str.substring(0,str.length-1);
  document.location.hash=str;
}

function offlineCacheFallback()
{
  if( !pageargs.autostart )
  {
    alert('Failed to use offline cache. Use ZIP mode or check browser limits');
  }
  else
  {
    alert('Failed to use offline cache. Will use uncached mode');
    pageargs.src ='zip';
    saveHash();
    document.location.reload();
  }
}

function isTouchDevice() {
  var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
  var mq = function(query) {
    return window.matchMedia(query).matches;
  }

  if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
    return true;
  }
  var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
  return mq(query);
}

function startXash()
{
  showElement('fSettings', false);
  showElement('controls',true);
  window.scrollTo(0, 0);
  savePageArgs();
  saveHash();
  setupFS();
  var base_args = [];
  if( pageargs.cmd )
    base_args = pageargs.cmd.split(',');
  if( pageargs.touchdetect == '1' && isTouchDevice() )
    base_args = base_args.concat(['+touch_enable','1','+m_ignore','1']);
  if( pageargs.calcres == '1' || pageargs.calcres == '2' )
  {
    // try calculate dpi-avare resolution
    var scrWidth = window.screen.availWidth;
    var scrHeight = window.screen.availHeight;
    var docWidth = document.body.clientWidth;
    var scale = docWidth / scrWidth;
    if( scale && pageargs.calcres == '2' )
      scrHeight *= scale, scrWidth *= scale;
    if( scrHeight > scrWidth ) // screen will be rotated
    {
      var tmp = scrHeight;
      scrHeight = scrWidth;
      scrWidth = tmp;
    }
    Module.print('Detected screen resolution: '+scrWidth+'x'+scrHeight);
    base_args = base_args.concat(['-width', ''+(Math.round(scrWidth)),'-height',''+(Math.round(scrHeight))]);
  }
  Module.arguments = ['xash'].concat(base_args);
  Module.run = run = savedRun;
  if( pageargs.src == 'zip' )
    loadZIP(pageargs.zip);
  else if( pageargs.src == 'ac' )
  {
    var el = document.createElement('iframe');
    el.src = pageargs.ac;
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  else if( (!zipMods.length && !pkgMods.length) || pageargs.src == 'local' )
  {
    var el = document.getElementById('iZipFile');
    if( !el.files[0] )
      el.click();
    var reader = new FileReader();
    reader.onload = function(){
      mountZIP(reader.result);
      Module.print("Loaded zip data");
      savedRun();
    };
    reader.readAsArrayBuffer(el.files[0]);
  }
  else if( pageargs.src == 'pkg' )
  {
    var script = document.createElement('script');
    script.onload = savedRun;
    document.body.appendChild(script);
    script.src = pkgMods.length>1?document.getElementById('selectPkg').value:pkgMods[0][0];
  }

  showElement('canvas', true);

  window.addEventListener("beforeunload", function (e) {
    var confirmationMessage = 'Leave the game?';

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
  });
}

function mountZIP(data)
{
  var Buffer = BrowserFS.BFSRequire('buffer').Buffer;
  var buf;
  // workaround for bug when passing buffer from frame
  try
  {
    buf = Buffer.from(data);
  }
  catch( e )
  {
    // try construct without new, it is faster
    try
    {
      buf = Buffer.from(Uint8Array(data));
    }
    catch( e )
    {
      // new required in some firefox versions
      buf = Buffer.from(new Uint8Array(data));
    }
  }
  mfs.mount('/zip', new BrowserFS.FileSystem.ZipFS(buf));
  FS.mount(new BrowserFS.EmscriptenFS(), {root:'/zip'}, '/rodir');
}

function loadZIP(packageName)
{
  try
  {
    var req = idb.open(packageName, 1);
    req.onsuccess = function(event)
    {
      try
      {
        var db = event.target.result;
        var transaction = db.transaction(['data'], 'readonly');
        var package = transaction.objectStore('data');
        var get = package.get('data');
        get.onsuccess = function(event)
        {
          event.target.result
          try
          {
            mountZIP(event.target.result)
            savedRun();
          }
          catch(e)
          {
            Module.print(e); fetchZIP(packageName, savedRun);
          }
        }
        req.onerror = function(event)
        {
          Module.print(e); fetchZIP(packageName, savedRun);
        }
      }
      catch(e)
      {
        Module.print(e); fetchZIP(packageName, savedRun);
      }
    }
    req.onerror = function(event)
    {
      Module.print(event); fetchZIP(packageName, savedRun)
    }
    req.onupgradeneeded = function(event)
    {
      var db = event.target.result;
      db.createObjectStore('data');
    }

  }
  catch( e )
  {
    fetchZIP(packageName, savedRun)
    Module.print(e);
  }
}

function saveZIP(packageName, data)
{
  function zipErr(e)
  {
    Module.print('Error saving idb cache: ' +e);
    mountZIP(data);
    savedRun();
  }
  try
  {
    var req = idb.open(packageName, 1);
    req.onsuccess = function(event)
    {
      try
      {
        var db = event.target.result;
        var transaction = db.transaction(['data'], 'readwrite');
        var package = transaction.objectStore('data');
        var get = package.put(data, 'data');
        get.onsuccess = function(event) {
          Module.print('save success');
          mountZIP(data);
          savedRun();
        }
        get.onerror = zipErr;
      }
      catch(e)
      {
        zipErr(e);
      }
    }
    req.onupgradeneeded = function(event)
    {
      var db = event.target.result;
      db.createObjectStore('data');
    }
    req.onerror = zipErr;
  }
  catch( e )
  {
    zipErr(e);
  }
}

function fetchZIP(packageName, cb)
{
  var xhr = new XMLHttpRequest();
  xhr.open('GET', packageName, true);
  xhr.responseType = 'arraybuffer';

  xhr.onprogress = function(event) {
    var url = packageName;
    var size;
    if (event.total) size = event.total;
    else size = zipMods[document.getElementById('selectZip').selectedIndex][2];
    if (event.loaded) {
      var total = size;
      var loaded = event.loaded;
      var num = 0;
      if (Module['setStatus']) Module['setStatus']('Downloading data... (' + loaded + '/' + total + ')');
    } else if (!Module.dataFileDownloads) {
      if (Module['setStatus']) Module['setStatus']('Downloading data...');
    }
  };
  xhr.onerror = function(event) {
    throw new Error("NetworkError");
  }
  xhr.onload = function(event) {
    if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
      saveZIP(packageName, xhr.response);

    } else {
      throw new Error(xhr.statusText + " : " + xhr.responseURL);
    }
  };
  xhr.send(null);
}

function setupFS()
{
  FS.mkdir('/rodir');
  FS.mkdir('/xash');
  try
  { 
    mfs = new BrowserFS.FileSystem.MountableFileSystem();
    BrowserFS.initialize(mfs);
  }
  catch(e)
  {
    mfs = undefined;
    Module.print('Failed to initialize BrowserFS: '+e);
  }

  if( pageargs.fs == 'idb' )
  {
    FS.mount(IDBFS,{},'/xash');
    FS.syncfs(true,function(err){if(err)Module.print('Loading IDBFS: ' + err);});
    mounted = true;
  }

  if( pageargs.fs == 'ls' && mfs)
  {
    mfs.mount('/ls', new BrowserFS.FileSystem.LocalStorage());
    FS.mount(new BrowserFS.EmscriptenFS(), {root:'/ls'}, '/xash');
    // LocalStorage is not suitable for downloads
    // only allow to keep saverestore and configs here
    try
    {
      FS.mkdir('/xash/valve');
      FS.mkdir('/xash/valve/downloaded');
    }
    catch(e){}
    try
    {
      FS.mount(MEMFS,{}, '/xash/valve/downloaded');
    }
    catch(e)
    {
      Module.print(e);
    }
    Module.print('LocalStorage mounted');
  }

  FS.chdir('/xash/');
}

function skipRun()
{
  savedRun = run;
  Module.run = haltRun;
  run = haltRun;

  Module.setStatus("Engine downloaded!");

  if(idb)
    showElement('idbHider', true);
  prepareSelects();
  if( !pageargs.autostart || pageargs.src == 'local' )
    showElement('fSettings',true);

  ENV.XASH3D_GAMEDIR = gamedir;
  ENV.XASH3D_RODIR = '/rodir'

  function loadModule(name)
  {
    var script = document.createElement('script');
    script.onload = function() {
      moduleCount++;
      if(moduleCount==3) {
        Module.setStatus("Libraries downloaded!");
        if( pageargs.autostart == '1' )
          startXash();
      }
    };
    document.body.appendChild(script);
    script.src = libprefix + name + ".js";
  }

  loadModule("server");
  loadModule("client");
  loadModule("menu");
};

Module.preInit = [skipRun];
Module.websocket = [];
Module.websocket.url = 'wsproxy://the-swank.pp.ua:3000/'
ENV = [];
var appCache = window.applicationCache;
if( appCache )
{
  var initState = appCache.status;
  Module.print("appCache status: "+ appCache.status);
  appCache.addEventListener('cached', function(e) {Module.print('Appcache cached, status:' + appCache.status)}, false);
  appCache.addEventListener('downloading', function(e) {Module.print('Appcache downloading, status:' + appCache.status)}, false);
  appCache.addEventListener('progress', function(e) {Module.print('Appcache progress, status:' + appCache.status); if(initState != 0 && appCache.status == 0) Module.print("appCache error detected");},	false);
  appCache.addEventListener('updateready', function(e) {
    Module.print('Appcache updateready, status:' + appCache.status);
    try{appCache.swapCache();}catch(e){}
  }, false);
  appCache.addEventListener('error', function(e) {Module.print('Appcache error: '+e+', status:' + appCache.status)}, false);
  appCache.addEventListener('checking', function(e) {Module.print('Appcache checking, status:' + appCache.status)}, false);

}
else
  Module.print("appCache not supported!");
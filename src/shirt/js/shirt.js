
function Shirt(id) {
    this.id = id;
    this.post = new Shirt.Post(this);
    if(this.get("toc"))
	this.toc = new Shirt.Toc(this);
    if(this.get("pageno"))
	this.pager = new Shirt.Pager(this);
    this.index = new Shirt.Index(this);
    this.hashloc = new Shirt.Hashloc(this);
    if(this.get("tagcloud"))
	this.tagcloud = new Shirt.Tagcloud(this);
}
Shirt.prototype = {
    load: function(url, handler) {
	Shirt.Conn.get(url, handler, function(status, c) {
	    alert("error: could not load:<br/><b>"+ status +"</b> "+ c.statusText);
	});
    },
    get: function(c) {
	var b = document.getElementById(this.id);
	for(var n = b.firstElementChild; n; n = n.nextElementSibling) {
	    var d = n.className.split(" ");
	    for(var i in d)
		if(d[i] == c)
		    return n;
	}
	return null;
    },
    update: function(c, html) {
	var n = this.get(c);
	if(n)
	    n.innerHTML = html;
    },
};

Shirt.Conn = {
    make: function() {
	try {
	    var ret = new XMLHttpRequest();
	    if(ret.overrideMimeType)
		ret.overrideMimeType('text/html');
	    return ret;
	}
	catch (e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); }
	catch (e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); }
	catch (e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP"); }
	catch (e) {}
	try { return new ActiveXObject("Microsoft.XMLHTTP"); }
	catch (e) {}
	console.error("XMLHTTPRequest not available");
	return null;
    },
    get: function(url, success, failure) {
	var c = Shirt.Conn.make();
	if(!c)
	    return null;
	c.onreadystatechange = Shirt.Conn.make_handler(c, success, failure);
	c.open("GET", url, true);
	c.withCredentials = true; // allow server to set cookies
	c.send();
	return true;
    },
    make_handler: function(c, success, failure) {
	return function _Conn_handler(ev) {
	    switch(c.readyState) {
	    case 0: // UNSENT
	    case 1: // WAITING
	    case 2: // HEADERS
	    case 3: // LOADING
		return true;
	    case 4: // DONE
		if(c.status == 200)
		    success(c.responseText, c);
		else if(failure)
		    failure(c.status, c);
		return true;
	    };
	};
    },
};

Shirt.Post = function(shirt) {
    this.shirt = shirt;
    shirt.register_onpost = this.register_onpost.bind(this);
    shirt.load_post = this.load_post.bind(this);
    shirt.register_onpost(this, "update_post");
};
Shirt.Post.prototype = {
    onpost_callbacks: [],
    register_onpost: function(obj, fname) {
	// this construction allows to change obj's member function after registering
	this.onpost_callbacks.push(function(post, body) {
	    obj[fname](post, body);
	});
    },
    onpost: function(f, text) {
	var post = this.parse_post(text);
	post.file = f;
	for(var i in this.onpost_callbacks)
	    this.onpost_callbacks[i](post, post.body);
    },

    rewrite_link: function(href) {
	// add md/ prefix but leave offsite, absolute, and relative links untouched:
	return /^https?:\/\/|^\/|^\/|^\.\.\//.exec(href) ? href : "md/" + href;
    },
    format_date: function(d) {
	if(!d)
	    return "";
	d = new Date(d * 1000);
	return d ? d.toLocaleDateString() +" "+ d.toLocaleTimeString() : "";
    },
    scroll_to_top: function() {
	window.scrollTo(0, 0);
    },

    markdown: function(text) {
	var rewrite_link = this.rewrite_link.bind(this);
	var r = new marked.Renderer();
	r.parent_link = r.link;
	r.link = function(href, title, text) {
	    return this.parent_link(rewrite_link(href), title, text);
	};
	r.parent_image = r.image;
	r.image = function(href, title, text) {
	    return this.parent_image(rewrite_link(href), title, text);
	};
	return marked(text, {
	    renderer: r,
	    rob: true,
	});
    },

    header_regexp: new RegExp(/^([^:]*): *(.*)$/),
    parse_post: function(text) {
	var ret = {};
	var lines = text.split("\n");
	var i, m, n = 0;
	for(i in lines) {
	    var m = this.header_regexp.exec(lines[i]);
	    if(!m)
		break;
	    ret[m[1]] = m[2];
	    n += lines[i].length;
	}
	ret.body = text.substr(n);
	return ret;
    },
    format_post: function(post, body) {
	var ts = this.format_date(post.pub_ts);
	var html = this.markdown(body);
	return "<div class='ts'>"+ ts +"</div>\n"+ html;
    },
    update_post: function(post, body) {
	this.shirt.update("post", this.format_post(post, body));
	this.scroll_to_top();
    },
    load_post: function(p) {
	this.shirt.load(p, this.onpost.bind(this, p));
    },
};

Shirt.Index = function(shirt) {
    this.shirt = shirt;
    shirt.register_onindex = this.register_onindex.bind(this);
    shirt.load_index = this.load_index.bind(this);
    shirt.load_top = this.load_top.bind(this);
    shirt.register_onindex(this, "update_index");
    shirt.register_onindex(this, "load_top");
};
Shirt.Index.prototype = {
    onindex_callbacks: [],
    register_onindex: function(obj, fname) {
	// this construction allows to change obj's member function after registering
	this.onindex_callbacks.push(function() {
	    obj[fname]();
	});
    },
    onindex: function(text) {
	this.parse_index(text);
	for(var i in this.onindex_callbacks)
	    this.onindex_callbacks[i](this.index);
    },

    index_file: "index.json",
    index: [],
    posts: {},
    top: null,
    parse_index: function(text) {
	var not_empty = function(s) {
	    return s.length > 0;
	};
	var l = text.split("\n").filter(not_empty).map(JSON.parse);
	if(!l.length)
	    return;
	var m = {}, w = [];
	for(var i in l) {
	    var p = l[i].file;
	    if(!(p in m)) {
		m[p] = {
	            first: l[i],
		};
		w.push(m[p]);
	    }
	    m[p].last = l[i];
	}
	this.index = [];
	for(var i in w) {
	    var r = w[i].last;
	    r.edit_ts = w[i].last.ts;
	    r.pub_ts = w[i].first.ts;
	    r.i = i;
	    this.index[i] = r;
	}

	this.posts = {};
	for(var i in this.index)
	    this.posts[this.index[i].file] = this.index[i];

	this.top = null;
	if(this.index.length)
	    this.top = this.index[this.index.length-1];
    },
    shorten: function(s, n) {
	// find ... and cut there, even if too long! // remove ... on markdown rendering
	// find last sentence boundary before maximum size
	// find last space within max size
	if(n < s.length)
	    return s.substr(0, n) +"...";
	return s;
    },
    format_more: function(_) {
	return "<div class='more'>read on...</div>\n"
    },
    format_teaser: function(post, body) {
	var body = this.shirt.post.format_post(post, body);
	var more = this.format_more(post);
	return "<a href='#' class='teaser' onclick='index_click(\""+ post.file +"\")'>"+ body + more +"</a>";
    },
    format_index: function() {
	var ret = [];
	for(var i in this.index) {
	    var body = this.shorten(this.index[i].teaser, 450);
	    ret.unshift(this.format_teaser(this.index[i], body)); // unshift reverses
	}
	return ret.join("\n");
    },
    update_index: function() {
	this.shirt.update("index", this.format_index());
    },
    load_index: function() {
	this.shirt.load(this.index_file, this.onindex.bind(this));
    },
    load_top: function() {
	if(top)
	    this.shirt.post.load_post(this.top.file);
    },
};

Shirt.Hashloc = function(shirt) {
    this.shirt = shirt;
    shirt.register_onpost(this, "onpost");
    shirt.register_onindex(this, "onindex");
};
// static functions
Shirt.Hashloc.write = function(p) {
    window.location.hash = "#!"+ p;
};
Shirt.Hashloc.read = function() {
    var h = decodeURIComponent(window.location.hash.split("+").join(" "));
    return (h.substr(0,2) == "#!") ? h.substr(2): "";
};
Shirt.Hashloc.prototype = {
    onpost: function(post, body) {
	Shirt.Hashloc.write(post.file);
    },
    onindex: function() {
	var s = Shirt.Hashloc.read();
	if(s in this.shirt.index.posts)
	    this.shirt.load_post(s);
	else
	    this.shirt.load_top();
    },
};

Shirt.Tagcloud = function(shirt) {
    this.shirt = shirt;
    this.index = shirt.index;
    shirt.register_onpost(this, "onpost");
    shirt.register_onindex(this, "onindex");
}
Shirt.Tagcloud.prototype = {
    tags: {},
    format_tag: function(t) {
	return "<a href='#!tag/"+ t +"' onclick='tag_click(\""+ t +"\")'>#"+ t +"</a>";
    },
    format_tagcloud: function() {
	var ret = [];
	for(var t in this.tags)
	    ret.push(this.format_tag(t));
	return ret.join("\n");
    },
    onpost: function() {
	this.shirt.update("tagcloud", this.format_tagcloud());
    },
    onindex: function() {
	this.tags = {};
	var index = this.index.index;
	for(var i in index) {
	    if(!index[i].tags)
		continue;
	    var t = index[i].tags.split(" ");
	    for(var j in t) {
		if(!(t[j] in this.tags))
		   this.tags[t[j]] = [];
		this.tags[t[j]].push(index[i]); // todo: overkill
	    }
	}
	this.shirt.update("tagcloud", this.format_tagcloud());
    },
};

Shirt.Toc = function(shirt) {
    this.shirt = shirt;
    shirt.register_onpost(this, "onpost");
}
Shirt.Toc.prototype = {
    is_toc: function(n) {
	return n.tagName == "H2";
    },
    // generate table of contents from <h?> while inserting <a name=...> elements into the html
    make_toc: function(node) {
	var ret = [];
	var i = 0;
	var first = node.firstElementChild;
	for(var n = first; n; n = n.nextElementSibling) {
	    if(!(this.is_toc(n)))
		continue;
	    var t = n.innerHTML;
	    n.innerHTML = "<a name='#toc-"+ i +"'></a>"+ n.innerHTML;
	    ret.push("<a href='#toc-"+ i +"'>"+ t +"</a>");
	    ++i;
	}
	return ret.join("\n");
    },
    onpost: function() {
	this.shirt.update("toc", this.make_toc(this.shirt.get("post")));
    },
};

Shirt.Pager = function(shirt) {
    this.shirt = shirt;
    shirt.register_onpost(this, "onpost");
}
Shirt.Pager.prototype = {
    is_fixed: function(n) {
	return n.tagName == "H1";
    },
    is_clear: function(n) {
	return n.tagName == "H2";
    },
    is_stop: function(n) {
	return n.tagName == "P" || n.tagName == "UL" || n.tagName == "IFRAME" || n.tagName == "CODE";
    },

    // utility functions
    timer: null,
    scroll_to_bottom: function() {
	if(this.timer)
	    clearTimeout(this.timer);
	this.timer = setTimeout(function() {
	    window.scrollTo(0, document.body.clientHeight);
	    this.timer = null;
	}.bind(this), 100);
    },

    // split dom into pages
    nstops: 0, current: 0, first: null,
    paginate: function() {
	this.first = this.shirt.get("post").firstElementChild;
	this.nstops = 0;
	for(var n = this.first; n; n = n.nextElementSibling)
	    if(this.is_stop(n))
		++this.nstops;
	this.page(0);
    },
    page: function(p) {
	if(p >= this.nstops)
	    p = this.nstops-1;
	if(p < 0)
	    p = 0;
	for(var n = this.first; n; n = n.nextElementSibling)
	    n.className = "";
	this.first.parentElement.className = "post";
	var c = null, f = null;
	this.current = 0;
	for(var n = this.first; n; n = n.nextElementSibling) {
	    if(this.is_clear(n))
		c = n;
	    if(this.is_fixed(n))
		f = n;
	    if(!this.is_stop(n))
		continue
	    if(this.current == p) {
		n.className = "stop";
		break;
	    }
	    ++this.current;
	}
	if(f)
	    f.className = "fixed";
	if(c)
	    c.className = "clear";
	else if(f)
	    f.className = "fixed clear";
	else
	    this.first.parentElement.className = "post clear";
	this.shirt.update("pageno", this.current);
	this.scroll_to_bottom();
    },
    keydown: function(e) {
	switch(e.keyCode) {
	case 39: case 32: case 70: case 78: // RIGHT SPACE "f" "n"
	    this.page(this.current+1);
	    break;
	case 37: case 8: case 66: case 80: // LEFT BACKSPACE "b" "p"
	    this.page(this.current-1);
	    break;
	case 48: case 49: // "0" "1"
	    this.page(e.keyCode - 48);
	    break;
	case 188: case 71: // "<" "g"
	    this.page(0);
	    break;
	case 190: // ">"
	    this.page(nstops);
	    break;
	case 73: // "i"
	    this.shirt.load_index();
	    break;
	default:
	    return;
	}
	e.preventDefault();
    },

    onpost: function() {
	this.paginate();
    },
};

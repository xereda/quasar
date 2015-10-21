describe('Require', function() {

  describe('Script', function() {

    var
      urlOne = '/fileOne.js',
      urlTwo = '/myfolder/fileTwo.js',
      urlThree = '/fileThree.js',

      reqOne = './fileOne',
      reqTwo = './myfolder/fileTwo',
      reqThree = './fileThree',

      contentType = {'Content-Type': 'application/javascript'}
      ;

    beforeEach(function() {
      this.server = sinon.fakeServer.create();
      quasar.clear.require.js.cache();
    });
    afterEach(function() {
      this.server.restore();
      quasar.clear.require.js.cache();
    });


    it('should be able to load a script file', function(done) {
      this.server.respondWith('GET', urlOne, [200, contentType, '']);
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.not.be.ok;
        done();
      });
      this.server.respond();
    });

    it('should be able to correctly resolve a convoluted path', function(done) {
      this.server.respondWith('GET', '/file.js', [200, contentType, '']);
      quasar.require.js('./first/second/../second/../.././file', function(err, module) {
        expect(err).to.not.be.ok;
        done();
      });
      this.server.respond();
    });

    it('should be able to load, execute and retrieve exports for a JS file', function(done) {
      this.server.respondWith('GET', urlOne, [200, contentType, 'console.log("works");var a = "saying";module.exports = { say: function() { return a; } };']);
      sinon.spy(window.console, 'log');
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.not.be.ok;

        expect(module).to.be.an('object');
        expect(module.say).to.be.a('function');
        expect(module.say()).to.equal('saying');

        expect(console.log).to.have.been.calledWith('works');
        window.console.log.restore();

        done();
      });
      this.server.respond();
    });

    it('should be able to cache a script file', function(done) {
      var times = 0;

      sinon.spy(window.console, 'log');

      quasar.require.js(reqOne, function(err, module) {
        ++times;
      });
      this.server.respondWith('GET', urlOne, [200, contentType, 'console.log("once only");']);
      this.server.respond();

      quasar.nextTick(function() {
        quasar.require.js(reqOne, function(err, module) {
          expect(err).to.not.be.ok;
          expect(++times).to.equal(2);

          expect(console.log).to.have.been.calledOnce;
          expect(console.log).to.have.been.calledWith('once only');

          window.console.log.restore();
          done();
        });
      });
    });

    it('should be able to deeply load a script file', function(done) {
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.not.be.ok;

        expect(module).to.be.a('string');
        expect(module).to.equal('saying');

        done();
      });

      this.server.respondWith('GET', urlOne, [200, contentType, 'var text = qRequire("./' + reqThree + '");module.exports = text.say();']);
      this.server.respond();
      this.server.respondWith('GET', urlThree, [200, contentType, 'var a = "saying";module.exports = { say: function() { return a; } };']);
      this.server.respond();
    });

    it('should be able to deeply load using relative paths', function(done) {
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.not.be.ok;

        expect(module).to.be.a('string');
        expect(module).to.equal('quasar');

        done();
      });

      this.server.respondWith('GET', urlOne, [200, contentType, 'var text = qRequire("' + reqTwo + '");module.exports = text.say();']);
      this.server.respond();
      this.server.respondWith('GET', urlTwo, [200, contentType, 'var three = qRequire("../' + reqThree + '"); var a = three; module.exports = { say: function() { return a; } };']);
      this.server.respond();
      this.server.respondWith('GET', urlThree, [200, contentType, 'module.exports = "quasar"; ']);
      this.server.respond();
    });

    it('should return error if cannot load script file', function(done) {
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.be.an('object');
        expect(err.status).to.equal(404);
        expect(module).not.to.exist;
        done();
      });

      this.server.respondWith('GET', urlOne, [404, contentType, '']);
      this.server.respond();
    });

    it('should return error if cannot deeply load script file', function(done) {
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.be.an('object');
        expect(err.status).to.equal(404);
        expect(module).not.to.exist;
        done();
      });

      this.server.respondWith('GET', urlOne, [200, contentType, 'var text = qRequire("' + reqTwo + '");module.exports = text.say();']);
      this.server.respond();
      this.server.respondWith('GET', urlTwo, [200, contentType, 'var three = qRequire("bogus"); var a = three; module.exports = { say: function() { return a; } };']);
      this.server.respond();
      this.server.respondWith('GET', '/bogus.js', [404, contentType, '']);
      this.server.respond();
    });

    it('should be able to load script file with multiple requires', function(done) {
      quasar.require.js(reqOne, function(err, module) {
        expect(err).to.not.be.ok;

        expect(module).to.be.an('object');
        expect(module.one).to.exist;
        expect(module.one).to.equal('first');
        expect(module.two).to.exist;
        expect(module.two).to.equal('second');

        done();
      });

      this.server.respondWith('GET', urlOne, [200, contentType, 'var text = qRequire("' + reqTwo + '"); var text2 = qRequire("' + reqThree + '");  module.exports = { one: text.say(), two: text2.say() };']);
      this.server.respond();
      this.server.respondWith('GET', urlTwo, [200, contentType, 'module.exports = { say: function() { return "first"; } };']);
      this.server.respondWith('GET', urlThree, [200, contentType, 'module.exports = { say: function() { return "second"; } };']);
      this.server.respond();
    });

    it('should be able to run factory function containing requires', function(done) {
      this.server.respondWith('GET', '/fileTwo.js', [200, contentType, 'var a = "module_3";module.exports = { say: function() { return a; } };']);
      this.server.autoRespond = true;

      quasar.require.js(function(qRequire, exports, module) {
        var text = qRequire('./fileTwo');

        module.exports = text.say();
      }, function(err, module) {
        expect(err).to.not.be.ok;
        expect(module).to.be.a('string');
        expect(module).to.equal('module_3');
        done();
      });
    });

    it('should be able to run factory function but without callback', function(done) {
      this.server.respondWith('GET', '/fileTwo.js', [200, contentType, 'var a = "module_3";module.exports = { say: function() { return a; } };']);
      this.server.autoRespond = true;

      quasar.require.js(function(qRequire, exports, module) {
        var text = qRequire('./fileTwo');

        module.exports = text.say();
        done();
      });
    });

    it('should be able to handle case when requiring a file already in progress of loading (simple case)', function(done) {
      var times = 0;
      var fn = function(err, exports) {
        times++;
        if (times == 2) {
          done();
        }
      };

      quasar.require.js('./fileOne', fn);
      quasar.require.js('./fileOne', fn);

      this.server.respondWith('GET', '/fileOne.js', [200, contentType, '']);
      this.server.respond();

      quasar.nextTick(function() {
        this.server.respond();
      }.bind(this));
    });

    it('should be able to handle case when requiring a file already in progress of loading (complex case)', function(done) {
      this.server.respondWith('GET', '/fileOne.js', [200, contentType, 'var a = qRequire("/fileThree"); module.exports = "module one";']);
      this.server.respondWith('GET', '/fileTwo.js', [200, contentType, 'var a = qRequire("/fileThree"); module.exports = "module two";']);

      quasar.require.js(function(qRequire, exports, module) {
        var text = qRequire('./fileOne');
        var text2 = qRequire('./fileTwo');

        module.exports = {
          one: text,
          two: text2
        };
      }, function(err, module) {
        expect(err).to.not.be.ok;
        expect(module).to.be.an('object');
        done();
      });

      quasar.nextTick(function() {
        this.server.respond();
      }.bind(this));

      this.server.respond();
      quasar.nextTick(function() {
        this.server.respondWith('GET', '/fileThree.js', [200, contentType, '']);
        this.server.respond();
      }.bind(this));
    });

  });

  describe('CSS', function() {

    var
      url = '/my-bogus-url.css',
      elements = {
        global: $('#__quasar_global_css'),
        page: $('#__quasar_page_css')
      };

    _.forEach(elements, function(element, type) {

      it('should guarantee DOM elements for ' + type + ' injecting', function() {
        expect(element).to.have.length(1);
      });

      it('should be able to inject ' + type + ' CSS', function() {
        quasar.inject[type].css(url);
        expect(element.children()).to.have.length(1);

        var el = $(element.children()[0]);

        expect(el.attr('href')).to.equal(url);
        expect(el.attr('rel')).to.equal('stylesheet');
        expect(el.attr('type')).to.equal('text/css');
      });

      it('should be able to empty ' + type + ' CSS element', function() {
        expect(element.children()).to.have.length(1);
        quasar.clear[type].css();
        expect(element.children()).to.have.length(0);
      });

      it('should not inject ' + type + ' duplicate CSS', function() {
        quasar.clear[type].css();
        quasar.inject[type].css(url);
        quasar.inject[type].css(url);
        expect(element.children()).to.have.length(1);
      });

    });

  });

});
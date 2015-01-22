import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";
import ApplicationInstance from "ember-application/system/application-instance";
import { indexOf } from "ember-metal/array";
import jQuery from "ember-views/system/jquery";

var app;

if (Ember.FEATURES.isEnabled('ember-application-instance-initializers')) {
  QUnit.module("Ember.Application instance initializers", {
    setup: function() {
    },

    teardown: function() {
      if (app) {
        run(function() { app.destroy(); });
      }
    }
  });

  test("initializers require proper 'name' and 'initialize' properties", function() {
    var MyApplication = Application.extend();

    expectAssertion(function() {
      run(function() {
        MyApplication.instanceInitializer({ name: 'initializer' });
      });
    });

    expectAssertion(function() {
      run(function() {
        MyApplication.instanceInitializer({ initialize: Ember.K });
      });
    });

  });

  test("initializers are passed an app instance", function() {
    var MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'initializer',
      initialize: function(instance) {
        ok(instance instanceof ApplicationInstance, "initialize is passed an application instance");
      }
    });

    run(function() {
      app = MyApplication.create({
        router: false,
        rootElement: '#qunit-fixture'
      });
    });
  });

  test("initializers can be registered in a specified order", function() {
    var order = [];
    var MyApplication = Application.extend();
    MyApplication.instanceInitializer({
      name: 'fourth',
      after: 'third',
      initialize: function(registry) {
        order.push('fourth');
      }
    });

    MyApplication.instanceInitializer({
      name: 'second',
      after: 'first',
      before: 'third',
      initialize: function(registry) {
        order.push('second');
      }
    });

    MyApplication.instanceInitializer({
      name: 'fifth',
      after: 'fourth',
      before: 'sixth',
      initialize: function(registry) {
        order.push('fifth');
      }
    });

    MyApplication.instanceInitializer({
      name: 'first',
      before: 'second',
      initialize: function(registry) {
        order.push('first');
      }
    });

    MyApplication.instanceInitializer({
      name: 'third',
      initialize: function(registry) {
        order.push('third');
      }
    });

    MyApplication.instanceInitializer({
      name: 'sixth',
      initialize: function(registry) {
        order.push('sixth');
      }
    });

    run(function() {
      app = MyApplication.create({
        router: false,
        rootElement: '#qunit-fixture'
      });
    });

    deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  });

  test("initializers can have multiple dependencies", function () {
    var order = [];
    var a = {
      name: "a",
      before: "b",
      initialize: function(registry) {
        order.push('a');
      }
    };
    var b = {
      name: "b",
      initialize: function(registry) {
        order.push('b');
      }
    };
    var c = {
      name: "c",
      after: "b",
      initialize: function(registry) {
        order.push('c');
      }
    };
    var afterB = {
      name: "after b",
      after: "b",
      initialize: function(registry) {
        order.push("after b");
      }
    };
    var afterC = {
      name: "after c",
      after: "c",
      initialize: function(registry) {
        order.push("after c");
      }
    };

    Application.instanceInitializer(b);
    Application.instanceInitializer(a);
    Application.instanceInitializer(afterC);
    Application.instanceInitializer(afterB);
    Application.instanceInitializer(c);

    run(function() {
      app = Application.create({
        router: false,
        rootElement: '#qunit-fixture'
      });
    });

    ok(indexOf.call(order, a.name) < indexOf.call(order, b.name), 'a < b');
    ok(indexOf.call(order, b.name) < indexOf.call(order, c.name), 'b < c');
    ok(indexOf.call(order, b.name) < indexOf.call(order, afterB.name), 'b < afterB');
    ok(indexOf.call(order, c.name) < indexOf.call(order, afterC.name), 'c < afterC');
  });

  test("initializers set on Application subclasses should not be shared between apps", function() {
    var firstInitializerRunCount = 0;
    var secondInitializerRunCount = 0;
    var FirstApp = Application.extend();
    FirstApp.instanceInitializer({
      name: 'first',
      initialize: function(registry) {
        firstInitializerRunCount++;
      }
    });
    var SecondApp = Application.extend();
    SecondApp.instanceInitializer({
      name: 'second',
      initialize: function(registry) {
        secondInitializerRunCount++;
      }
    });
    jQuery('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
    run(function() {
      FirstApp.create({
        router: false,
        rootElement: '#qunit-fixture #first'
      });
    });
    equal(firstInitializerRunCount, 1, 'first initializer only was run');
    equal(secondInitializerRunCount, 0, 'first initializer only was run');
    run(function() {
      SecondApp.create({
        router: false,
        rootElement: '#qunit-fixture #second'
      });
    });
    equal(firstInitializerRunCount, 1, 'second initializer only was run');
    equal(secondInitializerRunCount, 1, 'second initializer only was run');
  });

  test("initializers are concatenated", function() {
    var firstInitializerRunCount = 0;
    var secondInitializerRunCount = 0;
    var FirstApp = Application.extend();
    FirstApp.instanceInitializer({
      name: 'first',
      initialize: function(registry) {
        firstInitializerRunCount++;
      }
    });

    var SecondApp = FirstApp.extend();
    SecondApp.instanceInitializer({
      name: 'second',
      initialize: function(registry) {
        secondInitializerRunCount++;
      }
    });

    jQuery('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
    run(function() {
      FirstApp.create({
        router: false,
        rootElement: '#qunit-fixture #first'
      });
    });
    equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
    equal(secondInitializerRunCount, 0, 'first initializer only was run when base class created');
    firstInitializerRunCount = 0;
    run(function() {
      SecondApp.create({
        router: false,
        rootElement: '#qunit-fixture #second'
      });
    });
    equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
    equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');
  });

  test("initializers are per-app", function() {
    expect(0);
    var FirstApp = Application.extend();
    FirstApp.instanceInitializer({
      name: 'shouldNotCollide',
      initialize: function(registry) {}
    });

    var SecondApp = Application.extend();
    SecondApp.instanceInitializer({
      name: 'shouldNotCollide',
      initialize: function(registry) {}
    });
  });

  if (Ember.FEATURES.isEnabled("ember-application-initializer-context")) {
    test("initializers should be executed in their own context", function() {
      expect(1);
      var MyApplication = Application.extend();

      MyApplication.instanceInitializer({
        name: 'coolBabeInitializer',
        myProperty: 'coolBabe',
        initialize: function(registry, application) {
          equal(this.myProperty, 'coolBabe', 'should have access to its own context');
        }
      });

      run(function() {
        app = MyApplication.create({
          router: false,
          rootElement: '#qunit-fixture'
        });
      });
    });
  }
}

#!/usr/bin/env node

const Koa = require('koa');
const body = require('koa-json-body');
const cp = require('child_process');
const request = require('request');
const router = require('koa-router')();

const app = new Koa();
const port = 8080;

// A simple manager which tracks all event subscriptions
class Manager {
  constructor() {
    this._events = {}
    this._nrSentEvents = 0;
  }

  subscribe(id, endpoint, eventName, data) {
    data = data || {};
    console.log(`[subscribe] id:'${id}', endpoint:'${endpoint}', `+
                `name:'${eventName}', data: `, data);
    if (this._events[eventName] === undefined) {
      this._events[eventName] = {};
    }
    // check that the id is new
    if (this._events[eventName][id] !== undefined) {
      return false;
    }
    this._events[eventName][id] = {
      endpoint,
      data,
    }
    return true;
  }

  unsubscribe(id, eventName) {
    console.log(`[unsubscribe] id:'${id}', name:'${eventName}'`);
    // check that the id belongs to a listener
    if (this._events[eventName] === undefined) {
      return false;
    }
    if (this._events[eventName][id] === undefined) {
      return false;
    }
    delete this._events[eventName][id];
    return true;
  }

  publish(eventName, data) {
    console.log(`[publish] '${eventName}' payload: `, data);
    if (this._events[eventName] === undefined) {
      return false;
    }
    Object.values(this._events[eventName]).forEach(node => {
        // filter for user (optional)
        if (node.data.user !== undefined &&
            data.user !== undefined) {
          if (node.data.user == data.user) {
            this._sendEvent(node, eventName, data);
          }
        } else {
          // no filtering
          this._sendEvent(node, eventName, data);
        }
    });
    return true;
  }

   /*
    Send events as CloudEvent JSON.
    See also: https://github.com/cloudevents/spec/blob/master/json-format.md
   */
  _sendEvent(node, eventName, eventData) {
    return request.post(node.endpoint, {
      json: {
        eventType: eventName,
        type: 'com.microservices.node.template',
        specversion: '0.2',
        source: '/my-source',
        id: `NODE-TEMPLATE-${this._nrSentEvents++}`,
        time: (new Date()).toISOString(),
        datacontenttype: 'application/json',
        data: eventData,
      }
    });
  }
}

const manager = new Manager();

// connect pubsub endpoints with the event controller
router.post('/events', (ctx, next) => {
  const { id, endpoint, event, data} = ctx.request.body;
  ctx.body = {success: manager.subscribe(id, endpoint, event, data)};
});

router.delete('/events', ctx => {
  const { id, event } = ctx.request.body;
  ctx.body = {success: manager.unsubscribe(id, event)};
});

router.post('/publish', ctx => {
  const { eventName, user, data } = ctx.request.body;
  data.user = user;
  ctx.body = {success: manager.publish(eventName, data)};
});

router.get('/health', ctx => {
  ctx.body = 'OK';
});

// heartbeat events
setInterval(() => {
  manager.publish('heartbeat', {user: 'max', time: new Date().toString()});
}, 3000);
setInterval(() => {
  manager.publish('heartbeat', {user: 'moritz', time: new Date().toString()});
}, 5000);

app.use(body())
app.use(router.routes());
app.listen(port);
console.log(`Listening on localhost:${port}`);

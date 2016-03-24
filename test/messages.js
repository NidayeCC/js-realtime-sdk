import 'should';
import 'should-sinon';
import { Promise } from 'rsvp';
import uuid from 'uuid';
import Realtime from '../src/realtime';
import Message from '../src/messages/message';
import TypedMessage from '../src/messages/typed-message';
import TextMessage from '../src/messages/text-message';

import {
  APP_ID,
  APP_KEY,
  REGION,
} from './configs';

// const sinon = (typeof window !== 'undefined' && window.sinon) || require('sinon');

describe('Messages', () => {
  describe('TypedMessage', () => {
    it('toJSON', () => {
      new TypedMessage()
        .setAttrs({
          lean: 'cloud',
        })
        .setText('rocks')
        .toJSON()
        .should.eql({
          _lctext: 'rocks',
          _lcattrs: {
            lean: 'cloud',
          },
          _lctype: 0,
        });
    });
  });
  describe('TextMessage', () => {
    it('param check', () => {
      (() => new TextMessage({})).should.throw(TypeError);
    });
    it('parse and toJSON', () => {
      const json = {
        _lctext: 'leancloud',
        _lcattrs: {
          lean: 'cloud',
        },
        _lctype: -1,
      };
      const message = new TextMessage(json._lctext)
        .setAttrs(json._lcattrs);
      message.toJSON().should.eql(json);
      const parsedMessage = TextMessage.parse(json);
      parsedMessage.should.be.instanceof(TextMessage);
      parsedMessage.getText().should.eql(json._lctext);
      parsedMessage.getAttrs().should.eql(json._lcattrs);
      parsedMessage.toJSON().should.eql(json);
    });
  });

  describe('sending messages', () => {
    // let realtime;
    let wchen;
    let zwang;
    const wchenId = uuid.v4();
    const zwangId = uuid.v4();
    let conversationWchen;
    let conversationZwang;
    before(() => {
      const realtime = new Realtime({
        appId: APP_ID,
        appKey: APP_KEY,
        region: REGION,
        pushUnread: false,
      });
      return Promise.all([
        realtime.createIMClient(wchenId),
        realtime.createIMClient(zwangId),
      ]).then(clients => {
        [wchen, zwang] = clients;
        return wchen.createConversation({
          members: [zwangId],
          name: 'message test conversation',
        });
      }).then(conversation => {
        conversationWchen = conversation;
        return zwang.getConversation(conversation.id);
      }).then(conversation => {
        conversationZwang = conversation;
      });
    });

    after(() => Promise.all([
      wchen.close(),
      zwang.close(),
    ]));

    it('sending message', () => {
      const receivePromise = new Promise((resolve) => {
        conversationZwang.on('message', resolve);
      });
      const sendPromise = conversationWchen.send(new Message('hello'));
      return Promise.all([receivePromise, sendPromise]).then(messages => {
        const [receivedMessage, sentMessage] = messages;
        receivedMessage.id.should.be.eql(sentMessage.id);
        receivedMessage.content.should.be.eql(sentMessage.content);
      });
    });
    it('sending typed message', () => {
      const receivePromise = new Promise((resolve) => {
        conversationZwang.on('message', resolve);
      });
      const sendPromise = conversationWchen.send(
        new TextMessage('hello').setAttrs({
          leancloud: 'rocks',
        })
      );
      return Promise.all([receivePromise, sendPromise]).then(messages => {
        const [receivedMessage, sentMessage] = messages;
        receivedMessage.id.should.be.equal(sentMessage.id);
        receivedMessage.getText().should.be.eql(sentMessage.getText());
        receivedMessage.getAttrs().should.be.eql(sentMessage.getAttrs());
      });
    });
  });
});

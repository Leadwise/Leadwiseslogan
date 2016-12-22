import { connect, Connection, Channel, Options, Message } from 'amqplib';
import { Observable, Subject, ReplaySubject, Subscriber } from 'rxjs';
import { LoggerInstance } from 'winston';
import { EventEmitter } from 'events';

import createLogger from '../common/logging';

export class QueueConnection {
  private _activeChannels: number = 0;
  private _logger; LoggerInstance;

  private constructor(private _connection: Connection, url: string) {
    this._logger = createLogger("generator", "queue", url);
    this._logger.info(`AMQP connection established`);
  }

  public async createChannel(): Promise<Channel> {
    this._logger.info(`Creating AMQP channel`);
    const chan = await this._connection.createChannel();
    this._activeChannels += 1;

    this._logger.info(`AMQP channel created. This connection currently maintains ${this._activeChannels} channels`);

    chan.once("close", async () => {
      this._activeChannels -= 1;

      this._logger.info(`AMQP channel closed. This connection currently maintains ${this._activeChannels} channels`);
      
      if (this._activeChannels == 0) {
        this._logger.info(`No active channels. Closing AMQP connection`);
        await this._connection.close();
        this._logger.info(`AMQP connection closed`);
      }
    });

    return chan;
  }

  public async createInputQueue<TContent>(queueName: string, queueOptions: Options.AssertQueue = undefined): Promise<InputQueue<TContent>> {
    let channel = await this.createChannel();
    return await InputQueue.create(channel, queueName, queueOptions);
  }

  public async createOutputQueue<TContent>(queueName: string, queueOptions: Options.AssertQueue = undefined): Promise<OutputQueue<TContent>> {
    let channel = await this.createChannel();
    return await OutputQueue.create(channel, queueName, queueOptions);
  }

  public static async create(url: string): Promise<QueueConnection> {
    var connection = await connect(url);
    return new QueueConnection(connection, url);
  }
}

export interface InputChannelMessage {
  channel: Channel,
  message: Message
}

export class InputQueue<TContent> extends EventEmitter {
  private constructor(
    private _channel: Channel,
    private _queueName: string,
    private _logger: LoggerInstance
  ) {
    super();
  }

  public ackAll() {
    this._channel.ackAll();
  }

  public nackAll() {
    this._channel.nackAll();
  }

  public async getNextMessage(): Promise<ChannelMessage<TContent>> {
    let message = await this._channel.get(this._queueName);
    if (typeof message === "boolean") {
      return null;
    }
    return new ChannelMessage<TContent>({
      channel: this._channel,
      message
    });
  }

  public async close() {
    await this._channel.close()
    this._logger.info(`Channel closed`, this);
    this.emit('closed');
  }

  public static async create<TContent>(
    channel: Channel,
    queueName: string,
    queueOptions: Options.AssertQueue = undefined,
    prefetchSize = 1000
  ): Promise<InputQueue<TContent>> {
    channel.prefetch(prefetchSize);
    const logger = createLogger('common', 'queue', 'input', queueName);
    let queueSetup = await channel.assertQueue(queueName, queueOptions);
    logger.info("Queue configured");

    return new InputQueue<TContent>(
      channel,
      queueName,
      logger
    );
  }
}

export class ChannelMessage<TContent> {
  private _channel: Channel;
  private _message: Message;
  public content: TContent;

  constructor(channelMessage: InputChannelMessage) {
    this._channel = channelMessage.channel;
    this._message = channelMessage.message;
    this.content = deserializeMessage<TContent>(
      this._message.content,
      this._message.properties.contentType,
      this._message.properties.contentEncoding
    )
  }

  public ack() {
    this._channel.ack(this._message);
  }

  public nack() {
    this._channel.nack(this._message);
  }
}

function deserializeMessage<TContent>(
  content: Buffer,
  contentType: string = 'application/json',
  contentEncoding: string = 'utf8'
): TContent {
  switch (contentType) {
    case 'application/json':
      let text = content.toString(contentEncoding);
      return <TContent>JSON.parse(text);
    default:
      throw new Error(`Usupported content type: ${contentType}`);
  }
}

export interface SerializedMessage {
  contentType: string;
  contentEncoding: string;
  content: Buffer;
}

export class OutputQueue<TContent> {
  public contentEncoding: string = 'utf8';
  
  private constructor(
    private _channel: Channel,
    private _queueName: string,
    private _logger: LoggerInstance
  ) {
  }

  private _serialize(message: TContent): SerializedMessage {
    let text = JSON.stringify(message);
    let buffer = new Buffer(text, this.contentEncoding);
    return {
      contentType: 'application/json',
      contentEncoding: this.contentEncoding,
      content: buffer
    };
  }

  private _sendToQueue(message: SerializedMessage): boolean {
    return this._channel.sendToQueue(
      this._queueName,
      message.content,
      {
        contentType: message.contentType,
        contentEncoding: message.contentEncoding
      });
  }

  public submit(message: TContent): boolean {
    let serializedMessage = this._serialize(message);
    return this._sendToQueue(serializedMessage);
  }

  public static async create<TContent>(
    channel: Channel,
    queueName: string,
    queueOptions: Options.AssertQueue = undefined
  ) {
    const logger = createLogger('common', 'queue', 'output', queueName);
    let queueSetup = await channel.assertQueue(queueName, queueOptions);
    logger.info("Queue configured");

    return new OutputQueue<TContent>(channel, queueSetup.queue, logger);
  }
}
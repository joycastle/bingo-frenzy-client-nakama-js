/**
 * Copyright 2018 The Nakama Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiNotification, ApiRpc } from "./api.gen";
import { Session } from "./session";
import { Notification } from "./client";
import { deflateRaw, inflateRaw} from "pako";

type RequireKeys<T, K extends keyof T> = Omit<Partial<T>, K> & Pick<T, K>;

/** Stores function references for resolve/reject with a DOM Promise. */
interface PromiseExecutor {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

export interface Presence {
  user_id: string;
  session_id: string;
  username: string;
  node: string;
}

/** A response fron a channel join operation. */
export interface Channel {
  id: string;
  presences: Presence[];
  self: Presence;
}

/** Join a realtime chat channel. */
export interface ChannelJoin {
  channel_join: {
    target: string;
    type: number;
    persistence: boolean;
    hidden: boolean;
  };
}

/** Leave a realtime chat channel. */
export interface ChannelLeave {
  channel_leave: {
    channel_id: string;
  };
}

/** An incoming message on a realtime chat channel. */
export interface ChannelMessage {
  channel_id: string;
  message_id: string;
  code: number;
  sender_id: string;
  username: string;
  content: any;
  create_time: string;
  update_time: string;
  persistent: boolean;
}

/** An acknowledgement received in response to sending a message on a chat channel. */
export interface ChannelMessageAck {
  channel_id: string;
  message_id: string;
  code: number;
  username: string;
  create_time: string;
  update_time: string;
  persistence: boolean;
}

/** Send a message to a realtime chat channel. */
export interface ChannelMessageSend {
  channel_message_send: {
    channel_id: string;
    content: any;
  };
}

/** Update a message previously sent to a realtime chat channel. */
export interface ChannelMessageUpdate {
  channel_message_update: {
    channel_id: string,
    message_id: string,
    content: any;
  };
}

/** Remove a message previously sent to a realtime chat channel. */
export interface ChannelMessageRemove {
  channel_message_remove: {
    channel_id: string;
    message_id: string;
  };
}

/** Presence update for a particular realtime chat channel. */
export interface ChannelPresenceEvent {
  channel_id: string;
  joins: Presence[];
  leaves: Presence[];
}

/** Stream identifier */
export interface StreamId {
  mode: number;
  subject: string;
  descriptor: string;
  label: string;
}

/** Stream data. */
export interface StreamData {
  stream: StreamId;
  stream_presence: Presence;
  data: string;
}

/** Presence updates. */
export interface StreamPresenceEvent {
  stream: StreamId;
  joins: Presence[];
  leaves: Presence[];
}

/** Match presence updates. */
export interface MatchPresenceEvent {
  match_id: string;
  joins: Presence[];
  leaves: Presence[];
}

/** Start a matchmaking process. */
export interface MatchmakerAdd {
  matchmaker_add: {
    min_count: number;
    max_count: number;
    query: string;
    string_properties?: Record<string, string>;
    numeric_properties?: Record<string, number>;
  };
}

/** Cancel a matchmaking process. */
export interface MatchmakerRemove {
  matchmaker_remove: {
    ticket: string;
  };
}

/** A reference to a user and their matchmaking properties. */
export interface MatchmakerUser {
  presence: Presence;
  string_properties?: Record<string, string>;
  numeric_properties?: Record<string, number>;
}

/** Matchmaking result. */
export interface MatchmakerMatched {
  ticket: string;
  match_id: string;
  token: string;
  users: MatchmakerUser[];
  self: MatchmakerUser;
}

/** A realtime match */
export interface Match {
  match_id: string;
  authoritative: boolean;
  label?: string;
  size: number;
  presences: Presence[];
  self: Presence;
}

/** Create a multiplayer match. */
export interface CreateMatch {
  match_create: {};
}

/** Join a multiplayer match. */
export interface JoinMatch {
  match_join: {
    match_id?: string;
    token?: string;
    metadata?: {};
  };
}

/** Leave a multiplayer match. */
export interface LeaveMatch {
  match_leave: {
    match_id: string;
  };
}

/** Match data */
export interface MatchData {
  match_id: string;
  op_code: number;
  data: any;
  presence: Presence;
}

/** Send a message contains match data. */
export interface MatchDataSend {
  match_data_send: RequireKeys<MatchData, "match_id" | "op_code" | "data">;
}

/** Execute an Lua function on the server. */
export interface Rpc {
  rpc: ApiRpc;
}

/** A snapshot of statuses for some set of users. */
export interface Status {
  presences: Presence[];
}

/** Start receiving status updates for some set of users. */
export interface StatusFollow {
  status_follow: {user_ids: string[];}
}

/** A batch of status updates for a given user. */
export interface StatusPresenceEvent {
  joins: Presence[];
  leaves: Presence[];
}

/** Stop receiving status updates for some set of users. */
export interface StatusUnfollow {
  status_unfollow: {user_ids: string[];};
}

/** Set the user's own status. */
export interface StatusUpdate {
  status_update: {status?: string;};
}

/** A socket connection to Nakama server. */
export interface Socket {
  // Connect to the server.
  connect(session: Session, createStatus: boolean, useBuffer: boolean, compressionThreshold: number): Promise<Session>;
  // Disconnect from the server.
  disconnect(fireDisconnectEvent: boolean): void;
  // Send message to the server.
  send(message: ChannelJoin | ChannelLeave | ChannelMessageSend |
    ChannelMessageUpdate | ChannelMessageRemove | CreateMatch | JoinMatch |
    LeaveMatch | MatchDataSend | MatchmakerAdd | MatchmakerRemove | Rpc |
    StatusFollow | StatusUnfollow | StatusUpdate): Promise<any>;
  // Handle disconnect events received from the socket.
  ondisconnect: (evt: CloseEvent) => void;
  // Handle error events received from the socket.
  onerror: (evt: Event) => void;
  // Receive notifications from the socket.
  onnotification: (notification: Notification) => void;
  // Receive match data updates.
  onmatchdata: (matchData: MatchData) => void;
  // Receive match presence updates.
  onmatchpresence: (matchPresence: MatchPresenceEvent) => void;
  // Receive matchmaking results.
  onmatchmakermatched: (matchmakerMatched: MatchmakerMatched) => void;
  // Receive status presence updates.
  onstatuspresence: (statusPresence: StatusPresenceEvent) => void;
  // Receive stream presence updates.
  onstreampresence: (streamPresence: StreamPresenceEvent) => void;
  // Receive stream data.
  onstreamdata: (streamData: StreamData) => void;
  // Receive channel message.
  onchannelmessage: (channelMessage: ChannelMessage) => void;
  // Receive channel presence updates.
  onchannelpresence: (channelPresence: ChannelPresenceEvent) => void;
  // send ping to server
  sendPing(): void;
  // Receive pong message.
  onpong: () => void;
}

/** Reports an error received from a socket message. */
export interface SocketError {
  // The error code.
  code: number;
  // A message in English to help developers debug the response.
  message: string;
}

/** A socket connection to Nakama server implemented with the DOM's WebSocket API. */
export class DefaultSocket implements Socket {
  private socket?: WebSocket;
  private cIds: { [key: string]: PromiseExecutor };
  private nextCid: number;
  private useBuffer: boolean = false;
  private compressionThreshold: number = 500;
  private recentSendData: string[] = [];
  private recentRecvData: string[] = [];

  constructor(
      readonly host: string,
      readonly port: string,
      readonly useSSL: boolean = false,
      public verbose: boolean = false) {
    this.cIds = {};
    this.nextCid = 1;
  }

  generatecid(): string {
    const cid = this.nextCid.toString();
    ++this.nextCid;
    return cid;
  }

  connect(session: Session, createStatus: boolean = false, useBuffer: boolean = false, compressionThreshold: number = 500): Promise<Session> {
    this.useBuffer = useBuffer;
    this.compressionThreshold = compressionThreshold;
    if (this.socket !== undefined && this.socket.readyState === 1) {
      return Promise.resolve(session);
    }

    const scheme = (this.useSSL) ? "wss://" : "ws://";
    const url = `${scheme}${this.host}:${this.port}/ws?lang=en&status=${encodeURIComponent(createStatus.toString())}&token=${encodeURIComponent(session.token)}&format=${useBuffer ? "binary" : "json"}&compression_threshold=${compressionThreshold}`;
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.onclose = (evt: CloseEvent) => {
      if (this.socket !== socket) {
        return;
      }

      Object.keys(this.cIds).forEach((key) => {
        const executor = this.cIds[key];
        executor.reject(new Error("socket closed"));
      });
      this.cIds = {};

      console.log("recent send data:", this.recentSendData.join(","));
      console.log("recent recv data:", this.recentRecvData.join(","));
      
      this.ondisconnect(evt);
    }

    socket.onmessage = (evt: MessageEvent) => {
      if (this.socket !== socket) {
        return;
      }
      const data = this.convertRecvData(evt.data);
      if (data === "pong") {
        this.onpong();
        return;
      }

      let message = null;
      try {
        message = JSON.parse(data);
      } catch (e) {
        console.error(e);
        console.log("can not parse data:", data);
        this.onerror(evt);
        return;
      }

      if (this.verbose && window && window.console) {
        console.log("Response: %o", message);
      }

      // Inbound message from server.
      if (message.cid == undefined) {
        if (message.notifications) {
          message.notifications.notifications.forEach((n: ApiNotification) => {
            const notification: Notification = {
              code: n.code,
              create_time: n.create_time,
              id: n.id,
              persistent: n.persistent,
              sender_id: n.sender_id,
              subject: n.subject,
              content: n.content ? JSON.parse(n.content) : undefined,
            };
            this.onnotification(notification);
          });
        } else if (message.match_data) {
          message.match_data.data = message.match_data.data != null ? JSON.parse(atob(message.match_data.data)) : null;
          message.match_data.op_code = parseInt(message.match_data.op_code);
          this.onmatchdata(message.match_data);
        } else if (message.match_presence_event) {
          this.onmatchpresence(<MatchPresenceEvent>message.match_presence_event);
        } else if (message.matchmaker_matched) {
          this.onmatchmakermatched(<MatchmakerMatched>message.matchmaker_matched);
        } else if (message.status_presence_event) {
          this.onstatuspresence(<StatusPresenceEvent>message.status_presence_event);
        } else if (message.stream_presence_event) {
          this.onstreampresence(<StreamPresenceEvent>message.stream_presence_event);
        } else if (message.stream_data) {
          this.onstreamdata(<StreamData>message.stream_data);
        } else if (message.channel_message) {
          message.channel_message.content = JSON.parse(message.channel_message.content);
          this.onchannelmessage(<ChannelMessage>message.channel_message);
        } else if (message.channel_presence_event) {
          this.onchannelpresence(<ChannelPresenceEvent>message.channel_presence_event);
        } else {
          if (this.verbose && window && window.console) {
            console.log("Unrecognized message received: %o", message);
          }
        }
      } else {
        const executor = this.cIds[message.cid];
        if (!executor) {
          if (this.verbose && window && window.console) {
            console.error("No promise executor for message: %o", message);
          }
          return;
        }
        delete this.cIds[message.cid];

        if (message.error) {
          executor.reject(new Error(JSON.stringify(message.error)));
        } else {
          executor.resolve(message);
        }
      }
    }

    return new Promise((resolve, reject) => {
      socket.onopen = (evt: Event) => {
        if (this.socket !== socket) {
          return;
        }
        if (this.verbose && window && window.console) {
          console.log(evt);
        }
        resolve(session);
      }
      socket.onerror = (evt: Event) => {
        if (this.socket !== socket) {
          return;
        }
        reject(new Error("connect onerror: " + evt));
        socket.close();
      }
    });
  }

  disconnect(fireDisconnectEvent: boolean = true) {
    if (this.socket !== undefined) {
      this.socket.close();
    }
    if (fireDisconnectEvent) {
      this.ondisconnect(<CloseEvent>{});
    }
  }

  ondisconnect(evt: CloseEvent) {
    if (this.verbose && window && window.console) {
      console.log(evt);
    }
  }

  onerror(evt: Event) {
    if (this.verbose && window && window.console) {
      console.log(evt);
    }
  }

  onchannelmessage(channelMessage: ChannelMessage) {
    if (this.verbose && window && window.console) {
      console.log(channelMessage);
    }
  }

  onchannelpresence(channelPresence: ChannelPresenceEvent) {
    if (this.verbose && window && window.console) {
      console.log(channelPresence);
    }
  }

  onnotification(notification: Notification) {
    if (this.verbose && window && window.console) {
      console.log(notification);
    }
  }

  onmatchdata(matchData: MatchData) {
    if (this.verbose && window && window.console) {
      console.log(matchData);
    }
  }

  onmatchpresence(matchPresence: MatchPresenceEvent) {
    if (this.verbose && window && window.console) {
      console.log(matchPresence);
    }
  }

  onmatchmakermatched(matchmakerMatched: MatchmakerMatched) {
    if (this.verbose && window && window.console) {
      console.log(matchmakerMatched);
    }
  }

  onstatuspresence(statusPresence: StatusPresenceEvent) {
    if (this.verbose && window && window.console) {
      console.log(statusPresence);
    }
  }

  onstreampresence(streamPresence: StreamPresenceEvent) {
    if (this.verbose && window && window.console) {
      console.log(streamPresence);
    }
  }

  onstreamdata(streamData: StreamData) {
    if (this.verbose && window && window.console) {
      console.log(streamData);
    }
  }

  send(message: ChannelJoin | ChannelLeave | ChannelMessageSend |
    ChannelMessageUpdate | ChannelMessageRemove | CreateMatch |
    JoinMatch | LeaveMatch | MatchDataSend | MatchmakerAdd | MatchmakerRemove |
    Rpc | StatusFollow | StatusUnfollow | StatusUpdate): Promise<any> {
    const m = message as any;
    return new Promise((resolve, reject) => {
      if (this.socket === undefined) {
        reject(new Error("Socket connection has not been established yet."));
      } else if (this.socket.readyState !== 1) {
        reject(new Error("Socket connection has not been open yet."));
      } else {
        if (m.match_data_send) {
          m.match_data_send.data = btoa(JSON.stringify(m.match_data_send.data));
          m.match_data_send.op_code = m.match_data_send.op_code.toString();
          this.socket.send(this.convertSendData(JSON.stringify(m)));
          resolve(null);
        } else {
          if (m.channel_message_send) {
            m.channel_message_send.content = JSON.stringify(m.channel_message_send.content);
          } else if (m.channel_message_update) {
            m.channel_message_update.content = JSON.stringify(m.channel_message_update.content);
          }

          const cid = this.generatecid();
          this.cIds[cid] = {resolve, reject};

          // Add id for promise executor.
          m.cid = cid;
          this.socket.send(this.convertSendData(JSON.stringify(m)));
        }
      }

      if (this.verbose && window && window.console) {
        console.log("Sent message: %o", m);
      }
    });
  }

  sendPing() {
    if (!this.socket) {
      return;
    }
    if (this.socket.readyState !== 1) {
      return;
    }
    this.socket.send(this.convertSendData("ping"));
  }

  onpong() {
    if (this.verbose && window && window.console) {
      console.log("received pong");
    }
  }

  convertSendData(data: string): string | Buffer {
    if (!this.useBuffer) {
      return data;
    }
    let sendBuff = Buffer.from(data);
    if (sendBuff.byteLength < this.compressionThreshold) {
      sendBuff = Buffer.concat([sendBuff, Buffer.from([0])]);
    } else {
      const compressedBuff = Buffer.from(deflateRaw(sendBuff, {level: 1}));
      sendBuff = Buffer.concat([compressedBuff, Buffer.from([1])]);
    }
    this.recentSendData.push(sendBuff.toString("base64"));
    this.recentSendData.splice(0, this.recentSendData.length - 2)
    return sendBuff;
  }

  convertRecvData(data: string | Buffer): string {
    if (typeof data === "string") {
      return data;
    }
    const recvBuff = Buffer.from(data);
    this.recentRecvData.push(recvBuff.toString("base64"));
    this.recentRecvData.splice(0, this.recentRecvData.length - 2)
    if (recvBuff[recvBuff.length - 1] === 0) {
      return recvBuff.slice(0, recvBuff.length - 1).toString();
    }
    return Buffer.from(inflateRaw(recvBuff.slice(0, recvBuff.length - 1))).toString();
  }
};

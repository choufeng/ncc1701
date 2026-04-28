export type MessageType = "MOUNT_ARTIFACT" | "PATCH_ARTIFACT";

export interface ArtifactMessage {
  type: MessageType;
  id: string;
  componentId: string;
  props: any;
}

export interface ServerToClientMessage {
  type: MessageType;
  payload: ArtifactMessage;
}

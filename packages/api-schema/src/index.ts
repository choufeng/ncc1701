export type MessageType =
  | "MOUNT_ARTIFACT"
  | "PATCH_ARTIFACT"
  | "DYNAMIC_ACTION";

export type DynamicAction = {
  id: string;
  label: string;
  primary?: boolean;
  event: string;
};

export interface ArtifactMessage {
  type: MessageType;
  id: string;
  componentId: string;
  props: any;
}

export interface ServerToClientMessage {
  type: MessageType;
  payload: ArtifactMessage | DynamicAction[];
}

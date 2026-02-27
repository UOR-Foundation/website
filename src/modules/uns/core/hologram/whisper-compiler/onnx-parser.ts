/**
 * ONNX Model Parser
 * ═════════════════
 *
 * Parses ONNX protobuf into typed structures using our inline decoder.
 * No onnxruntime, no protobufjs, no npm dependencies.
 *
 * Field numbers match the official onnx.proto3 specification.
 *
 * @module uns/core/hologram/whisper-compiler/onnx-parser
 */

import { ProtoReader, WireType } from "./proto-decoder";
import type {
  OnnxTensor,
  OnnxAttribute,
  OnnxNode,
  OnnxGraph,
  OnnxModel,
} from "./types";
import { OnnxDataType, DTYPE_BYTE_SIZE } from "./types";

// ── TensorProto (field numbers from onnx.proto3) ───────────────────────────

function parseTensorProto(reader: ProtoReader): OnnxTensor {
  const dims: number[] = [];
  let dataType: number = OnnxDataType.FLOAT;
  let name = "";
  let rawData: Uint8Array | null = null;
  let floatData: Float32Array | null = null;
  let int32Data: Int32Array | null = null;
  let int64Len = 0;
  let doubleData: Float64Array | null = null;
  let externalData: { location: string; offset: number; length: number } | undefined;

  let tag;
  while ((tag = reader.readTag()) !== null) {
    switch (tag.field) {
      case 1: // repeated int64 dims (packed or unpacked)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          dims.push(...reader.readPackedVarint64());
        } else {
          dims.push(reader.readVarint64AsNumber());
        }
        break;

      case 2: // int32 data_type
        dataType = reader.readVarint();
        break;

      case 3: // Segment segment (deprecated, skip)
        reader.skip(tag.wire);
        break;

      case 4: // repeated float float_data (packed)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          floatData = reader.readPackedFloat32();
        } else {
          floatData = new Float32Array([reader.readFloat32()]);
        }
        break;

      case 5: // repeated int32 int32_data (packed)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          int32Data = reader.readPackedInt32();
        } else {
          reader.skip(tag.wire);
        }
        break;

      case 6: // repeated bytes string_data
        reader.skip(tag.wire);
        break;

      case 7: // repeated int64 int64_data (packed)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          const vals = reader.readPackedVarint64();
          int64Len = vals.length;
        } else {
          reader.readVarint64AsNumber();
          int64Len++;
        }
        break;

      case 8: // string name
        name = reader.readString();
        break;

      case 9: // bytes raw_data (some ONNX exporters use field 9 instead of 13)
        rawData = reader.readBytes();
        break;

      case 10: // repeated double double_data (packed)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          doubleData = reader.readPackedFloat64();
        } else {
          reader.skip(tag.wire);
        }
        break;

      case 11: // repeated uint64 uint64_data
        reader.skip(tag.wire);
        break;

      case 12: // string doc_string
        reader.skip(tag.wire);
        break;

      case 13: // bytes raw_data (zero-copy view)
        rawData = reader.readBytes();
        break;

      case 14: { // repeated StringStringEntryProto external_data
        const sub = reader.subReader();
        let key = "", value = "";
        let stag;
        while ((stag = sub.readTag()) !== null) {
          if (stag.field === 1) key = sub.readString();
          else if (stag.field === 2) value = sub.readString();
          else sub.skip(stag.wire);
        }
        if (!externalData) externalData = { location: "", offset: 0, length: 0 };
        if (key === "location") externalData.location = value;
        else if (key === "offset") externalData.offset = parseInt(value, 10) || 0;
        else if (key === "length") externalData.length = parseInt(value, 10) || 0;
        break;
      }

      case 15: // DataLocation data_location
        reader.readVarint();
        break;

      default:
        reader.skip(tag.wire);
    }
  }

  // Normalize: ensure rawData always contains the tensor bytes
  let finalRawData: Uint8Array;

  if (rawData && rawData.byteLength > 0) {
    finalRawData = rawData;
  } else if (floatData && floatData.length > 0) {
    finalRawData = new Uint8Array(floatData.buffer, floatData.byteOffset, floatData.byteLength);
  } else if (int32Data && int32Data.length > 0) {
    finalRawData = new Uint8Array(int32Data.buffer, int32Data.byteOffset, int32Data.byteLength);
  } else if (doubleData && doubleData.length > 0) {
    finalRawData = new Uint8Array(doubleData.buffer, doubleData.byteOffset, doubleData.byteLength);
  } else {
    finalRawData = new Uint8Array(0);
  }

  const elementCount = dims.length > 0 ? dims.reduce((a, b) => a * b, 1) : 0;

  return { name, dims, dataType, rawData: finalRawData, elementCount, externalData };
}

// ── AttributeProto ─────────────────────────────────────────────────────────

function parseAttributeProto(reader: ProtoReader): OnnxAttribute {
  let name = "";
  let type = 0;
  let f: number | undefined;
  let i: number | undefined;
  let s: string | undefined;
  let t: OnnxTensor | undefined;
  const floats: number[] = [];
  const ints: number[] = [];

  let tag;
  while ((tag = reader.readTag()) !== null) {
    switch (tag.field) {
      case 1:  name = reader.readString(); break;
      case 20: type = reader.readVarint(); break;
      case 2:  f = reader.readFloat32(); break;

      case 3: // int64 i
        i = reader.readVarint64AsNumber();
        break;

      case 4: // bytes s
        s = new TextDecoder().decode(reader.readBytes());
        break;

      case 5: // TensorProto t
        t = parseTensorProto(reader.subReader());
        break;

      case 7: // repeated float floats (packed)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          const packed = reader.readPackedFloat32();
          for (let j = 0; j < packed.length; j++) floats.push(packed[j]);
        } else {
          floats.push(reader.readFloat32());
        }
        break;

      case 8: // repeated int64 ints (packed)
        if (tag.wire === WireType.LENGTH_DELIMITED) {
          ints.push(...reader.readPackedVarint64());
        } else {
          ints.push(reader.readVarint64AsNumber());
        }
        break;

      default:
        reader.skip(tag.wire);
    }
  }

  return {
    name,
    type,
    ...(f !== undefined && { f }),
    ...(i !== undefined && { i }),
    ...(s !== undefined && { s }),
    ...(t !== undefined && { t }),
    ...(floats.length > 0 && { floats }),
    ...(ints.length > 0 && { ints }),
  };
}

// ── NodeProto ──────────────────────────────────────────────────────────────

function parseNodeProto(reader: ProtoReader): OnnxNode {
  const inputs: string[] = [];
  const outputs: string[] = [];
  let name = "";
  let opType = "";
  const attributes: OnnxAttribute[] = [];

  let tag;
  while ((tag = reader.readTag()) !== null) {
    switch (tag.field) {
      case 1: inputs.push(reader.readString()); break;
      case 2: outputs.push(reader.readString()); break;
      case 3: name = reader.readString(); break;
      case 4: opType = reader.readString(); break;
      case 5: attributes.push(parseAttributeProto(reader.subReader())); break;
      default: reader.skip(tag.wire);
    }
  }

  return { inputs, outputs, name, opType, attributes };
}

// ── ValueInfoProto (we only extract the name) ──────────────────────────────

function parseValueInfoName(reader: ProtoReader): string {
  let name = "";
  let tag;
  while ((tag = reader.readTag()) !== null) {
    if (tag.field === 1) {
      name = reader.readString();
    } else {
      reader.skip(tag.wire);
    }
  }
  return name;
}

// ── GraphProto ─────────────────────────────────────────────────────────────

function parseGraphProto(reader: ProtoReader): OnnxGraph {
  const nodes: OnnxNode[] = [];
  let name = "";
  const initializers: OnnxTensor[] = [];
  const inputNames: string[] = [];
  const outputNames: string[] = [];

  let tag;
  while ((tag = reader.readTag()) !== null) {
    switch (tag.field) {
      case 1:  nodes.push(parseNodeProto(reader.subReader())); break;
      case 2:  name = reader.readString(); break;
      case 5:  initializers.push(parseTensorProto(reader.subReader())); break;
      case 11: inputNames.push(parseValueInfoName(reader.subReader())); break;
      case 12: outputNames.push(parseValueInfoName(reader.subReader())); break;
      default: reader.skip(tag.wire);
    }
  }

  return { name, nodes, initializers, inputNames, outputNames };
}

// ── OperatorSetIdProto ─────────────────────────────────────────────────────

function parseOpsetVersion(reader: ProtoReader): number {
  let version = 0;
  let tag;
  while ((tag = reader.readTag()) !== null) {
    if (tag.field === 2) {
      version = reader.readVarint64AsNumber();
    } else {
      reader.skip(tag.wire);
    }
  }
  return version;
}

// ── ModelProto (top-level) ─────────────────────────────────────────────────

/**
 * Parse a raw ONNX file (ArrayBuffer) into a typed OnnxModel.
 *
 * This is a zero-copy operation for tensor data — rawData fields
 * are views into the original buffer. Do not discard the ArrayBuffer
 * until tensors have been stored.
 *
 * @param buffer - The raw ONNX file bytes
 * @returns Parsed model with graph, nodes, and weight tensors
 */
export function parseOnnxModel(buffer: ArrayBuffer): OnnxModel {
  const reader = new ProtoReader(buffer);

  let irVersion = 0;
  let graph: OnnxGraph | null = null;
  let opsetVersion = 0;

  let tag;
  while ((tag = reader.readTag()) !== null) {
    switch (tag.field) {
      case 1: // int64 ir_version
        irVersion = reader.readVarint64AsNumber();
        break;

      case 7: // GraphProto graph
        graph = parseGraphProto(reader.subReader());
        break;

      case 8: // repeated OperatorSetIdProto opset_import
        opsetVersion = Math.max(opsetVersion, parseOpsetVersion(reader.subReader()));
        break;

      default:
        reader.skip(tag.wire);
    }
  }

  if (!graph) {
    throw new Error("[OnnxParser] No graph found in model");
  }

  return { irVersion, opsetVersion, graph };
}

/**
 * Get a summary of the parsed model (for logging/debugging).
 */
export function summarizeModel(model: OnnxModel): string {
  const g = model.graph;
  const totalBytes = g.initializers.reduce((sum, t) => sum + t.rawData.byteLength, 0);
  const totalParams = g.initializers.reduce((sum, t) => sum + t.elementCount, 0);

  const opCounts = new Map<string, number>();
  for (const node of g.nodes) {
    opCounts.set(node.opType, (opCounts.get(node.opType) ?? 0) + 1);
  }

  const opSummary = [...opCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([op, count]) => `  ${op}: ${count}`)
    .join("\n");

  return [
    `ONNX Model: ${g.name || "(unnamed)"}`,
    `IR Version: ${model.irVersion}, Opset: ${model.opsetVersion}`,
    `Nodes: ${g.nodes.length}`,
    `Initializers: ${g.initializers.length}`,
    `Parameters: ${totalParams.toLocaleString()}`,
    `Weight bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
    `Inputs: ${g.inputNames.join(", ")}`,
    `Outputs: ${g.outputNames.join(", ")}`,
    `Op breakdown:\n${opSummary}`,
  ].join("\n");
}

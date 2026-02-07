import axios from "axios";
import { XMLParser } from "fast-xml-parser";

/**
 * SOAP fault error with parsed fault details
 */
export class SoapFaultError extends Error {
  faultCode?: string;
  faultString?: string;
  isTransactionNotFound?: boolean;

  constructor(
    message: string,
    faultCode?: string,
    faultString?: string,
  ) {
    super(message);
    this.name = "SoapFaultError";
    if (faultCode !== undefined) {
      this.faultCode = faultCode;
    }
    if (faultString !== undefined) {
      this.faultString = faultString;
    }
    this.isTransactionNotFound =
      faultString?.includes("TRANSACTION_NOT_FOUND") || false;
  }
}

/** Parser config for SOAP fault responses */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

/**
 * Extract text content from XML element (handles both string and object with #text)
 */
function extractTextContent(value: any): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    // XML parser may return object with #text property when element has attributes
    return value["#text"] || value.text || String(value);
  }
  return undefined;
}

/**
 * Parse SOAP fault response to extract fault code and fault string
 */
function parseSoapFault(soapResponse: string): {
  faultCode: string | undefined;
  faultString: string | undefined;
} | null {
  try {
    const jsonObj = parser.parse(soapResponse);
    const fault =
      jsonObj?.["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"]?.["SOAP-ENV:Fault"] ||
      jsonObj?.["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"]?.["soapenv:Fault"] ||
      jsonObj?.Envelope?.Body?.Fault;

    if (!fault) {
      return null;
    }

    const faultCodeRaw =
      fault.faultcode || fault["SOAP-ENV:faultcode"] || fault["soapenv:faultcode"];
    const faultStringRaw =
      fault.faultstring ||
      fault["SOAP-ENV:faultstring"] ||
      fault["soapenv:faultstring"];

    return {
      faultCode: extractTextContent(faultCodeRaw),
      faultString: extractTextContent(faultStringRaw),
    };
  } catch (error) {
    // If parsing fails, return null (not a SOAP fault or malformed)
    return null;
  }
}

/**
 * Send a SOAP envelope to BAKONG_SOAP_URL (NBC Bakong service).
 * Used for: getIncomingTransaction, makeFullFundTransfer, makeReverseTransaction.
 */
export async function sendSoapRequest(soapBody: string): Promise<string> {
  try {
    const response = await axios.post(
      process.env.BAKONG_SOAP_URL || "",
      soapBody,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "",
        },
      },
    );
    return response.data;
  } catch (error: any) {
    console.error("Error sending SOAP request:", error);
    if (error.response?.data) {
      console.error("[SOAP] NBC SOAP Response:", error.response.data);
      
      // Try to parse SOAP fault from response
      const faultInfo = parseSoapFault(error.response.data);
      if (faultInfo) {
        const faultError = new SoapFaultError(
          `SOAP Fault: ${faultInfo.faultString || "Unknown fault"}`,
          faultInfo.faultCode,
          faultInfo.faultString,
        );
        throw faultError;
      }
    }
    throw new Error(`Failed to send SOAP request: ${error}`);
  }
}

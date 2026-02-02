import axios from "axios";

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
      console.error("📋 NBC SOAP Response:", error.response.data);
    }
    throw new Error(`Failed to send SOAP request: ${error}`);
  }
}

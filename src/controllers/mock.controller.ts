import { Request, Response } from "express";

/**
 * Mock Bakong/NBC SOAP endpoint for local testing.
 * Returns a fake getIncomingTransactionResponse with one REVERSING transaction.
 */
export const MockBakongController = {
  handleSoapRequest: (req: Request, res: Response) => {
    console.log("🎭 Mock Server received a call!");

    const fakeResponse = `
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <ns2:getIncomingTransactionResponse xmlns:ns2="http://service.bakong.nbc.org.kh/">
          <return>
             <CDATA>
                <![CDATA[
                <Document>
                  <FitToFICstmrCdtTrf>
                    <CdtTrfTxInf>
                      <PmtId>
                        <EndToEndId>TEST_REF_123</EndToEndId>
                      </PmtId>
                      <Amt>
                        <InstdAmt Ccy="KHR">10000</InstdAmt> 
                      </Amt>
                      <RmtInf>
                        <Ustrd>REVERSING transaction. trx_hash:abc1234567890def</Ustrd>
                      </RmtInf>
                    </CdtTrfTxInf>
                  </FitToFICstmrCdtTrf>
                </Document>
                ]]>
             </CDATA>
          </return>
        </ns2:getIncomingTransactionResponse>
      </soap:Body>
    </soap:Envelope>
    `;

    res.set("Content-Type", "text/xml");
    res.send(fakeResponse);
  },
};

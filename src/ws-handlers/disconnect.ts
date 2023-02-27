import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { clientsTable, dynamodbClient } from "../dynamoDB";
import {DeleteItemCommand, ScanCommand} from "@aws-sdk/client-dynamodb";

const responseOK = {
    statusCode: 200,
    body: "",
};

export const handler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const connectionId = event.requestContext?.connectionId as string;

        const clientsTableData = await dynamodbClient.send(
          new ScanCommand({
              TableName: clientsTable,
          }),
        );

        const matchingClient = clientsTableData.Items?.find((item) => item.connectionId.S === connectionId) || false;

        if (matchingClient) {
            await dynamodbClient.send(
              new DeleteItemCommand({
                  TableName: clientsTable,
                  Key: {
                      deviceId: {
                          S: matchingClient.deviceId.S as string,
                      },
                      connectionId: {
                          S: connectionId,
                      },
                  },
              }),
            );
        }


    } catch (error: any) {
        context.serverlessSdk.captureError(error);
        return {
            statusCode: 500,
            body: error.message,
        };
    }

    return responseOK;
};
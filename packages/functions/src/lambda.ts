import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Config } from 'sst/node/config';
import { Bucket } from 'sst/node/bucket';
import { Table } from 'sst/node/table';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { S3, S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const dynamoDb = new DynamoDB({ region: 'ap-northeast-2' });
const s3 = new S3({ region: 'ap-northeast-2' });
const ses = new SESClient({ region: 'ap-northeast-2' });
const BASE_PRICE = 3900;

export const handler = async (event: APIGatewayProxyEventV2) => {
  if (event.requestContext.http.method === 'GET') {
    if (event.rawPath === '/collections') {
     // get item from collections table
     const collectionId = event.queryStringParameters?.collectionId;

     if (collectionId == undefined) {
         return {
             statusCode: 400,
             body: JSON.stringify({
                 error: true,
                 message: 'Invalid request body',
             }),
         };
     }

     const params = {
         Key: { collectionId: { S: collectionId } },
         TableName: Table.Collections.tableName,
     };

     const { Item } = await dynamoDb.getItem(params);

     if (!Item) {
         return {
             statusCode: 400,
             body: JSON.stringify({
                 error: true,
                 message: 'Collection Id not exists',
             }),
         };
     }

     return {
         statusCode: 200,
         body: JSON.stringify({
             cStatus: Item.cStatus.N,
             name: Item.name.S,
             email: Item.email.S,
             createDatetime: Item.createDatetime.S,
             startDatetime: Item.startDatetime.S,
             endDatetime: Item.endDatetime.S,
             kind: Item.kind.S,
             paid: Item.paid.BOOL,
             price: Item.price.N,
             receipt: Item.receipt.S,
         }),
     };   
    } else if (event.rawPath === '/getImages') {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: true,
          message: 'Hello world. This is a bad request.',
        }),
      };
    }
  } else if (event.requestContext.http.method === 'POST') {
    if (event.rawPath === '/updateCollectionStatus') {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    } else if (event.rawPath === '/createCollection') {
      const collectionId = uuidv4();
      if (event.body == undefined) {
          return {
              statusCode: 400,
              body: JSON.stringify({
                  error: true,
                  message: 'Invalid request body',
              }),
          };
      }
      const body = JSON.parse(event.body);
      const email = body.email;
      const images = body.images;
      const kind = body.kind;
      const name = body.name;

      // get current time
      const currentDatetime = new Date().toISOString();
      const cStatus = 0;

      if (!email || !images || !kind || !name) {
          return {
              statusCode: 400,
              body: JSON.stringify({
                  error: true,
                  message:
                      'Please provide all "email" and "images" and "kind" and "name"',
              }),
          };
      }

      // check email format
      var re = /\S+@\S+\.\S+/;
      if (!re.test(email)) {
          return {
              statusCode: 400,
              body: JSON.stringify({
                  error: true,
                  message: 'Please provide valid email',
              }),
          };
      }

      if(images.length<8 || images.length>20){
        return {
          statusCode: 400,
          body: JSON.stringify({
              error: true,
              message:
                  'Please 8-20 images',
          }),
      };
      }
      // save images to s3
      let i = 0;

      for (const image of images) {
          const params = {
              Bucket: Bucket.Uploads.bucketName,
              Key: `${collectionId}/sks/sks (${i}).jpg`,
              Body: Buffer.from(image, 'base64'),
              ContentEncoding: 'base64',
              ContentType: 'image/jpeg',
              // ACL: 'public-read',
          };
          await s3.putObject(params);
          i += 1;
      }

      // generate 6 digit alphabet and number secret key
      let secretKey = '';
      for (i = 0; i < 6; i++) {
          secretKey += choose('abcdefghijklmnopqrstuvwxyz0123456789');
      }

      await dynamoDb.putItem({
          TableName: Table.Collections.tableName,
          Item: {
              collectionId: { S: collectionId },
              email: { S: email },
              name: { S: name },
              cStatus: { N: cStatus.toString() },
              createDatetime: { S: currentDatetime },
              startDatetime: { S: '' },
              endDatetime: { S: '' },
              paymentKey: { S: '' },
              kind: { S: kind },
              paid: { BOOL: false },
              price: { N: BASE_PRICE.toString() },
              secretKey: { S: secretKey },
              receipt: { S: '' },
          },
      });

      // send email with template collectionCreated
      await sendEmail(
          'collectionCreated',
          email,
          name,
          collectionId,
          secretKey
      );

      return {
          statusCode: 200,
          body: JSON.stringify({
              collectionId: collectionId,
              email: email,
          }),
      };
  } else if (event.rawPath === '/payment') {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    } else if (event.rawPath === '/execBanana') {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    } else if (event.rawPath === '/checkStartDatetime') {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    } else if (event.rawPath === '/cancelPayment') {
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    } else {
      // error handler
      return {
        statusCode: 404,
        body: 'Hello world. This is a bad request.',
      };
    }
  } else {
    return {
      statusCode: 400,
      body: 'Hello world. This is a bad request.',
    };
  }
};

async function sendEmail(
  template: string,
  email: string,
  name: string,
  collection_id: string,
  secretKey: string
) {
  let subject = '';
  let body = '';
  let baseURL = 'http://localhost:5173';

  if (template == 'collectionCreated') {
    subject = `[레이몽] ${name} 컬렉션 생성이 준비되었습니다!`;
    body = `레이몽 ${name} 컬렉션 생성이 준비되었습니다. 결제 후 AI가 이미지를 해석해서 멋진 그림들을 만들어 드릴께요! 혹시 결제를 못하고 페이지를 닫았다면 아래 링크를 눌러주세요!\n\n
          ${baseURL}/order?collectionId=${collection_id}&secretKey=${secretKey}`;
  } else if (template == 'paymentComplete') {
    subject = `[레이몽] ${name} 컬렉션 결제가 완료되었습니다!`;
    body = `레이몽 ${name} 컬렉션 결제가 완료되어 바로 AI가 해석하기 시작했어요! 시간은 대략 40분정도 소요됩니다. 현재 진행 상황이 궁금하시거나 영수증이 필요하시다면 아래 링크를 눌러주세요!\n\n
          ${baseURL}/status?collectionId=${collection_id}&secretKey=${secretKey} \n\n`;
  } else if (template == 'paymentCancelled') {
    subject = `[레이몽] ${name} 컬렉션 오류가 발생했습니다.`;
    body = `레이몽 ${name} 컬렉션을 AI가 해석하던 도중 오류가 발생하여 결제가 자동 취소되었습니다. 결제금 환불은 카드사에 따라 3~7 영업일이 소요됩니다. 불편을 끼쳐드려 죄송합니다.\n\n
          다시 시도하시려면 아래 링크를 눌러 컬렉션을 불러와 결제부터 다시 진행해주세요. 다시 한 번 불편을 끼쳐드려 죄송합니다. \n\n
          ${baseURL}/order?collectionId=${collection_id}&secretKey=${secretKey}`;
  } else if (template == 'imageReady') {
    subject = `[레이몽] ${name} 컬렉션이 완성되었습니다!`;
    body = `완성된 레이몽 ${name} 컬렉션을 감상하시려면 아래 링크를 눌러주세요! \n\n
          ${baseURL}/see?collectionId=${collection_id}&secretKey=${secretKey}`;
  } else if (template == 'paymentCompleteAlert') {
    subject = `[레이몽] ${name} 컬렉션 결제 완료 안내`;
    body = `레이몽 ${name} 컬렉션 결제 완료 \n 이메일: ${email} \n\n
          ${baseURL}/status?collectionId=${collection_id}&secretKey=${secretKey} \n\n`;
  }

  if (subject == '' || body == '') {
    return false;
  }

  let send_to = email;
  if (template == 'paymentCompleteAlert') send_to = Config.SENDER_EMAIL;

  const params = {
    Destination: {
      ToAddresses: [send_to],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: body,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: Config.SENDER_EMAIL,
  };

  await ses.send(new SendEmailCommand(params));

  return true;
}

function choose(choices: string) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}
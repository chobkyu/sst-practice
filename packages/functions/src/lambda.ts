import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Config } from 'sst/node/config';
import { Bucket } from 'sst/node/bucket';
import { Table } from 'sst/node/table';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { S3, S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fetch from "node-fetch";

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
      const collectionId = event.queryStringParameters?.collectionId;
            const secretKey = event.queryStringParameters?.secretKey;

            if (!collectionId || !secretKey) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: true,
                        message:
                            'Please provide both "collectionId" and "secretKey"',
                    }),
                };
            }

            // get collection info
            const params = {
                Key: { collectionId: { S: collectionId } },
                TableName: Table.Collections.tableName,
            };

            const { Item } = await dynamoDb.getItem(params);

            if (
                !Item ||
                Item.email.S == undefined ||
                Item.name.S == undefined ||
                Item.secretKey.S == undefined
            ) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: true,
                        message:
                            'Could not find collection with provided "collectionId"',
                    }),
                };
            }

            if (Item.secretKey.S != secretKey) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: true,
                        message:
                            'Could not find collection with provided secretKey',
                    }),
                };
            }

            // if cStatus is not 2 (completed), return error
            if (Item.cStatus.N != '2') {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: true,
                        message: 'image is not ready',
                    }),
                };
            }

            // get list of s3 objects in collection's folder
            const response = await s3.listObjectsV2({
                Bucket: Bucket.Uploads.bucketName,
                Prefix: `${collectionId}/results/`,
            });

            // if collection's folder is empty, return error
            if (!response.Contents) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: true,
                        message: 'no image found',
                    }),
                };
            }

            // generate presigned url for every image in collection's folder
            let urls = [];
            // sort by last modified time
            response.Contents.sort(
                (a: any, b: any) =>
                    parseInt(a.Key.split('result (')[1].split(')')[0]) -
                    parseInt(b.Key.split('result (')[1].split(')')[0])
            );
            const s3Client = new S3Client({ region: 'ap-northeast-2' });
            for (const obj of response.Contents) {
                const getObjectParams = {
                    Bucket: Bucket.Uploads.bucketName,
                    Key: obj.Key,
                };
                const command = new GetObjectCommand(getObjectParams);
                // presigned url will expire in 1 hour
                const url = await getSignedUrl(s3Client, command, {
                    expiresIn: 3600,
                });
                urls.push(url);
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    urls: urls,
                }),
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
      // get collectionId, secretKey, cStatus, bananaSecretKey
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
      const collectionId = body.collectionId;
      const secretKey = body.secretKey;
      const cStatus = body.cStatus;
      const bananaSecretKey = body.bananaSecretKey;

      // check bananaSecretKey
      if (bananaSecretKey != Config.BANANA_SECRET_KEY) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided bananaSecretKey',
          }),
        };
      }

      // get current time
      const currentDatetime = new Date().toISOString();

      if (!collectionId || !secretKey || !cStatus) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message:
              'Please provide both "collectionId" and "cStatus" and "secretKey"',
          }),
        };
      }

      // check secretKey
      const params = {
        Key: { collectionId: { S: collectionId } },
        TableName: Table.Collections.tableName,
      };

      const { Item } = await dynamoDb.getItem(params);

      if (
        !Item ||
        Item.email.S == undefined ||
        Item.name.S == undefined ||
        Item.secretKey.S == undefined
      ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided "collectionId"',
          }),
        };
      }

      if (Item.secretKey.S != secretKey) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided secretKey',
          }),
        };
      }

      if (parseInt(cStatus) == 1) {
        // if cStatus is 1, update startDatetime
        console.log('Dreambooth started!');
        console.log('collectionId: ', collectionId);
        console.log('startDatetime: ', currentDatetime);
        await dynamoDb.updateItem({
          TableName: Table.Collections.tableName,
          Key: { collectionId: { S: collectionId } },
          UpdateExpression: 'set cStatus = :p, startDatetime = :s',
          ExpressionAttributeValues: {
            ':p': { N: '1' },
            ':s': { S: currentDatetime },
          },
        });
      } else if (parseInt(cStatus) == 2) {
        // if cStatus is 2, update endDatetime
        console.log('Dreambooth ended!');
        console.log('collectionId: ', collectionId);
        console.log('endDatetime: ', currentDatetime);
        await dynamoDb.updateItem({
          TableName: Table.Collections.tableName,
          Key: { collectionId: { S: collectionId } },
          UpdateExpression: 'set cStatus = :p, endDatetime = :e',
          ExpressionAttributeValues: {
            ':p': { N: '2' },
            ':e': { S: currentDatetime },
          },
        });
        // send email with template image ready
        await sendEmail(
          'imageReady',
          Item.email.S,
          Item.name.S,
          collectionId,
          Item.secretKey.S
        );
      } else if (parseInt(cStatus) == 3) {
        // if cStatus is 3, update endDatetime
        console.log('Dreambooth ERROR!');
        console.log('collectionId: ', collectionId);
        console.log('endDatetime: ', currentDatetime);
        await dynamoDb.updateItem({
          TableName: Table.Collections.tableName,
          Key: { collectionId: { S: collectionId } },
          UpdateExpression: 'set cStatus = :p, endDatetime = :e',
          ExpressionAttributeValues: {
            ':p': { N: '3' },
            ':e': { S: currentDatetime },
          },
        });
        // cancel the payment
        await cancelPayment(collectionId);
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Invalid cStatus',
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          collectionId: collectionId,
        }),
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

      if (images.length < 8 || images.length > 20) {
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
      // get data from request body
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
      const collectionId = body.collectionId;
      const paymentKey = body.paymentKey;
      const price = body.price;

      // logs
      console.log('TRYING TO PAYMENT CONFIRM: ');
      console.log('collectionId: ', collectionId);
      console.log('PAYMENTKEY: ', paymentKey);
      console.log('PRICE: ', price);

      // get data from collections table
      const params = {
        Key: { collectionId: { S: collectionId } },
        TableName: Table.Collections.tableName,
      };

      const { Item } = await dynamoDb.getItem(params);

      if (
        !Item ||
        Item.email.S == undefined ||
        Item.name.S == undefined ||
        Item.secretKey.S == undefined
      ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided "collectionId"',
          }),
        };
      }

      // check payment
      if (Item.paid.BOOL == true) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Already paid',
          }),
        };
      }

      // check price
      if (BASE_PRICE != parseInt(price)) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Price is not correct',
          }),
        };
      }

      // confirm to toss payment api
      let receipt = '';
      let url = 'https://api.tosspayments.com/v1/payments/confirm';
      let headers = {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          Buffer.from(Config.TOSS_PAYMENTS_API_KEY + ':').toString(
            'base64'
          ),
      };
      let data = {
        paymentKey: paymentKey,
        amount: price,
        orderId: collectionId,
      };

      let response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });

      if (response.status != 200) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Payment is not confirmed',
          }),
        };
      }

      const responseJson = (await response.json()) as any;
      if (responseJson?.receipt == undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Payment is not confirmed',
          }),
        };
      }
      receipt = responseJson?.receipt.url;

      // update paid to true and enter paymentKey and price
      await dynamoDb.updateItem({
        TableName: Table.Collections.tableName,
        Key: { collectionId: { S: collectionId } },
        UpdateExpression:
          'set paid = :p, paymentKey = :pk, price = :pr, receipt = :r',
        ExpressionAttributeValues: {
          ':p': { BOOL: true },
          ':pk': { S: paymentKey },
          ':pr': { N: price },
          ':r': { S: receipt },
        },
      });

      // send email
      await sendEmail(
        'paymentComplete',
        Item.email.S,
        Item.name.S,
        collectionId,
        Item.secretKey.S
      );

      // send email for alert me
      await sendEmail(
        'paymentCompleteAlert',
        Item.email.S,
        Item.name.S,
        collectionId,
        Item.secretKey.S
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          receipt: receipt,
          secretKey: Item.secretKey.S,
        }),
      };

    } else if (event.rawPath === '/execBanana') {
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
      const collectionId = body.collectionId;

      console.log('EXEC BANANA: ', collectionId);

      // get data from collections table
      const params = {
        Key: { collectionId: { S: collectionId } },
        TableName: Table.Collections.tableName,
      };

      const { Item } = await dynamoDb.getItem(params);

      if (
        !Item ||
        Item.email.S == undefined ||
        Item.secretKey.S == undefined ||
        Item.kind.S == undefined
      ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided "collectionId"',
          }),
        };
      }

      const kind = Item.kind.S;
      const secretKey = Item.secretKey.S;

      // check is paid and cStatus == 0
      if (Item.paid.BOOL == false) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Not paid',
          }),
        };
      }

      if (Item.cStatus.N != '0') {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Already executed',
          }),
        };
      }

      // /execBanana 부분 중 하단부의 코드를 바나나에서 가져온 정보로 아래와 같이 수정
      // update cStatus to 1
      await dynamoDb.updateItem({
        TableName: Table.Collections.tableName,
        Key: { collectionId: { S: collectionId } },
        UpdateExpression: 'set cStatus = :p',
        ExpressionAttributeValues: {
          ':p': { N: '1' },
        },
      });

      const inputs = {
        input: {
          collection_id: collectionId,
          kind: kind,
          secret_key: secretKey,
          n_save_sample: 20, // 생성할 샘플의 수
          save_sample_negative_prompt:
            'frame, paper, letter, signature, keen eyes, two heads, siamese, two tongues, logo, half man half beast, three legs, too vivid, too realistic',
          save_guidance_scale: 8.5,
          num_class_images: 200, // 이번 강의에서는 다루지 않지만 우선 고정
          steps: 400, // 이 숫자를 늘리면 오래걸리지만 더 많이 학습함
          art_styles: [
            // 이부분을 수정해서 유화 대신 스케치를 그릴 수도 있고 나만의 프롬프트로 개조가 가능함
            `oil painting portrait of a ((zwx ${kind})), face shot`,
            `oil painting portrait of a ((zwx ${kind})), full body shot`,
          ],
        },
      };

      // RunPod를 돌리지 않을 때는 아래 runit을 false로 변경
      const runit = true;
      let outJson = {} as any;
      if (runit) {
        // RunPod이 실질적으로 돌아가는 코드
        const header = {
          'Content-Type': 'application/json',
          authorization: '3X33VNMOZLBTJDQIC609ZTJCSYF2FU1SHO2CTAYW',
        };
        let url = 'https://api.runpod.ai/v2/3vgw2gg02bws2d/run';

        let response = await fetch(url, {
          method: 'POST',
          headers: header,
          body: JSON.stringify(inputs)
        });

        outJson = await response.json();
        const outId = outJson?.id;
        try {
          url = `https://api.runpod.ai/v2/3vgw2gg02bws2d/status/${outId}`;
          response = await fetch(url, {
            method: 'POST',
            headers: header,
            body: JSON.stringify(inputs),
          });
          const outStatus = (await response.json()) as any;
        } catch (error) {
          console.log('STATUS_TIMEOUT');
        }
      } else {
        outJson = { result: 'success' };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          outJson: outJson,
        }),
      };
    } else if (event.rawPath === '/checkStartDatetime') {
      // get collectionId, secretKey, bananaSecretKey
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
      const collectionId = body.collectionId;
      const secretKey = body.secretKey;
      const bananaSecretKey = body.bananaSecretKey;

      // check bananaSecretKey
      if (bananaSecretKey != Config.BANANA_SECRET_KEY) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message: 'bananaSecretKey error',
          }),
        };
      }

      if (!collectionId || !secretKey) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message:
              'Please provide both "collectionId" and "cStatus" and "secretKey"',
          }),
        };
      }

      // check secretKey
      const params = {
        Key: { collectionId: { S: collectionId } },
        TableName: Table.Collections.tableName,
      };

      const { Item } = await dynamoDb.getItem(params);

      if (
        !Item ||
        Item.email.S == undefined ||
        Item.name.S == undefined ||
        Item.secretKey.S == undefined
      ) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided "collectionId"',
          }),
        };
      }

      if (Item.secretKey.S != secretKey) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message:
              'Could not find collection with provided secretKey',
          }),
        };
      }

      // check startDatetime is empty
      const startDatetime = Item.startDatetime.S;
      if (startDatetime != '') {
        return {
          statusCode: 400,
          body: JSON.stringify({
            startDatetime: startDatetime,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          startDatetime: '',
        }),
      };

    } else if (event.rawPath === '/cancelPayment') {
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

      const collectionId = body.collectionId;
      const result = await cancelPayment(collectionId);

      if (result == false) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'failed to cancel payment',
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          result: result,
          message: 'your payment has been cancelled',
        }),
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
  let baseURL = 'https://d3tzjazbu8jqcb.cloudfront.net';

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

async function cancelPayment(collectionId: string) {
  if (collectionId == undefined) {
    return false;
  }
  // get collection info
  const params = {
    Key: { collectionId: { S: collectionId } },
    TableName: Table.Collections.tableName,
  };

  const { Item } = await dynamoDb.getItem(params);

  if (
    !Item ||
    Item.email.S == undefined ||
    Item.name.S == undefined ||
    Item.secretKey.S == undefined
  ) {
    return false;
  }

  // if cStatus is not 3 (error), return error
  if (Item.cStatus.N != '3') {
    return false;
  }

  // request cancel to toss
  const url =
    'https://api.tosspayments.com/v1/payments/' +
    Item.paymentKey.S +
    '/cancel';

  let headers = {
    'Content-Type': 'application/json',
    Authorization:
      'Basic ' +
      Buffer.from(Config.TOSS_PAYMENTS_API_KEY + ':').toString('base64'),
  };

  let data = {
    cancelReason: 'user cancelled payment because of error',
  };

  let toss_response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  // if toss returns error, return error
  if (toss_response.status != 200) {
    return false;
  }

  // cancel payment
  await dynamoDb.updateItem({
    TableName: Table.Collections.tableName,
    Key: { collectionId: { S: collectionId } },
    UpdateExpression: 'set cStatus = :p',
    ExpressionAttributeValues: {
      ':p': { N: '4' },
    },
  });

  // send email
  await sendEmail(
    'paymentCancelled',
    Item.email.S,
    Item.name.S,
    collectionId,
    Item.secretKey.S
  );

  return true;
}

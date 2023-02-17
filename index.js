import express from 'express'
const app = express()
const port = 3000

//to use files from public folder
app.use(express.static('./public'));
// to permit requests from client side
app.use(express.json());

import nodemailer from 'nodemailer'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getDatabase, ref, onValue, get, child, remove } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDl1gq3UCUM0QIlmQaKaCpL3a6ibxmu2Mc",
  authDomain: "app-rioben.firebaseapp.com",
  databaseURL: "https://app-rioben-default-rtdb.firebaseio.com",
  projectId: "app-rioben",
  storageBucket: "app-rioben.appspot.com",
  messagingSenderId: "840451321443",
  appId: "1:840451321443:web:a5c8e720822cf617649256",
  measurementId: "G-JVFQLQPYRP"
};

//generate code
const this_is_my_number = Math.floor(Math.random()*90000) + 10000;
console.log("Esse é meu número " + this_is_my_number)


//expo notificaitons
import {Expo} from 'expo-server-sdk';
let expo = new Expo();


app.get('/', async (req, res) => {
  res.send('index'); 
})

app.get('/writeNotification', async (req, res) => { 
  res.sendFile('writeNotification.html', {root: './public/'})
})

app.get('/sendNotification', async (req, res) => {
  //the codes
    let primeiro_nome_format = '*primeiro_nome* '
    let nome_completo_format = '*nome_completo* '
    let email_format = '*email* '
    let mensagem = req.query.message;
    

  //initialize push array  
    let somePushTokens = [];
    
  // Initialize Firebase
    const fbapp = initializeApp(firebaseConfig);

    const db = getDatabase();
    const dbRef = ref(getDatabase());
    let contador = 0;
    let allTokensHere = null;


    await get(child(dbRef, 'aparelhos/')).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        allTokensHere = snapshot.val();
        
        //percorre todos os registros contidos em 'aparalhos/'
        for(let exp in data){
          //se o registro for pertencente ao
          if(data[exp].cpf == "06948050417"){
            somePushTokens.push({
              token: data[exp].token,
              nome: data[exp].nome,
              email: data[exp].email
            })
          }
          contador +=1;
        }
        console.log(contador)
        
      } else {
        console.log("No data available");
      }
    }).catch((error) => {
      console.error(error);
    });


  // //sending notifications
  let messages = [];
    for(let x=0; x < somePushTokens.length; x++ ) {
      // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
    
      // Check that all your push tokens appear to be valid Expo push tokens
      if (!Expo.isExpoPushToken(somePushTokens[x].token)) {
        console.error(`Push token ${somePushTokens[x].token} is not a valid Expo push token`);
        continue;
      }
    
      let fullname = somePushTokens[x].nome
      let allnames = fullname.split(' ')
        mensagem = mensagem.replace(primeiro_nome_format, allnames[0])
        mensagem = mensagem.replace(nome_completo_format, somePushTokens[x].nome)
        mensagem = mensagem.replace(email_format, somePushTokens[x].email)

        console.log(somePushTokens[x].token)

      // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
      messages.push({
        to: somePushTokens[x].token,
        sound: 'default',
        body: mensagem,
        data: { withSome: 'data' },
      })
    }

    
    let chunks = await expo.chunkPushNotifications(messages);
    let toBeDeleted = [];
    let tickets = [];
    await (async () => {
      // Send the chunks to the Expo push notification service. There are
      // different strategies you could use. A simple one is to send one chunk at a
      // time, which nicely spreads the load out over time:
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);

          //codigo para limpar o realtime database cada vez que encontrar um app sem server key
          for (let nrc=0; nrc < ticketChunk.length; nrc++){
            if(ticketChunk[nrc].status == "error"){
              toBeDeleted.push(messages[nrc].to)
            }
          }

          for(let tokenRecord in allTokensHere){
            for(let x=0; x<toBeDeleted.length; x++){
              if(allTokensHere[tokenRecord].token == toBeDeleted[x]){
                console.log(tokenRecord)
                remove(child(dbRef, 'aparelhos/' + tokenRecord)).then((snapshot) => {return false;})
              }
            }
          }
          

          tickets.push(...ticketChunk);
          // NOTE: If a ticket contains an error code in ticket.details.error, you
          // must handle it appropriately. The error codes are listed in the Expo
          // documentation:
          // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
        } catch (error) {
          console.error(error);
        }
      }
   })();
  
  res.json({
    'status': 'success'
  })
})

app.get('/checkcode/:code', (req, res) => { 
  const code = req.params.code

  if(code == this_is_my_number){
    console.log('entrou no if certo')
    res.json({'status': 'success'})
  }else{
    res.json({'status': 'failed'})
  }

})

app.get('/generatecode', async (req, res) => {
  console.log('was requested')

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.gestaogma.com.br",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'no-reply@gestaogma.com.br', 
      pass: '@Gma123456', 
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });

  //configurando mensagem
  let mensagem = {
    from: "no-reply@gestaogma.com.br", // sender address
    to: "dev@gestaogma.com.br",  // list of receivers 
    subject: "Um novo código foi gerado: " + this_is_my_number, // Subject line
    html: "O seu código para enviar notificação é: " + this_is_my_number + "", // html body
  }

  // send mail with defined transport object
  await transporter.sendMail(mensagem, 
    function(err){
      if(err){
        console.log(err)
      }else{
        console.log("tudo certo")
      }
  });

  res.json({'user': this_is_my_number})
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
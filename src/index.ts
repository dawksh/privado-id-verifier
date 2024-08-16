import express from "express";
import { config } from "dotenv";
import { auth, resolver, protocol } from "@iden3/js-iden3-auth";
import path from "path";
import getRawBody from "raw-body";

config();

const PORT = process.env.PORT || 3000;
const app = express();

const requestMap = new Map();

async function getAuthRequest(req: any, res: any) {
    // Audience is verifier id
    const hostUrl = "https://c164-103-214-61-248.ngrok-free.app";
    const sessionId = 1;
    const callbackURL = "/callback";
    const audience =
        "did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";

    const uri = `${hostUrl}${callbackURL}?sessionId=${sessionId}`;

    // Generate request for basic authentication
    const request = auth.createAuthorizationRequest("test flow", audience, uri);

    request.id = "7f38a193-0918-4a48-9fac-36adfdb8b542";
    request.thid = "7f38a193-0918-4a48-9fac-36adfdb8b542";

    // Add request for a specific proof
    const proofRequest = {
        id: 1,
        circuitId: "credentialAtomicQuerySigV2",
        query: {
            allowedIssuers: ["did:polygonid:polygon:main:2q8C2A8bro8hSeFrujPRMDBrQX7JyNQRvv2cpXgedR"],
            type: "AnimaProofOfLife",
            context:
                "https://raw.githubusercontent.com/anima-protocol/claims-polygonid/main/schemas/json-ld/pol-v1.json-ld",
            credentialSubject: {
                human: {
                    $eq: true,
                },
            },
        },
    };
    const scope = request.body.scope ?? [];
    request.body.scope = [...scope, proofRequest];

    // Store auth request in map associated with session ID
    requestMap.set(`${sessionId}`, request);

    return res.status(200).set("Content-Type", "application/json").send(request);
}

async function callback(req: any, res: any) {
    // Get session ID from request
    const sessionId = req.query.sessionId;
    let authResponse;

    // get JWZ token params from the post request
    const raw = await getRawBody(req);
    const tokenStr = raw.toString().trim();
    console.log(tokenStr);

    const ethURL = "https://polygon-amoy.drpc.org";
    const contractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
    const keyDIR = "../keys";

    const ethStateResolver = new resolver.EthStateResolver(
        ethURL,
        contractAddress
    );

    const resolvers = {
        ["polygon:amoy"]: ethStateResolver,
    };

    // fetch authRequest from sessionID
    const authRequest = requestMap.get(`${sessionId}`);

    // EXECUTE VERIFICATION
    const verifier = await auth.Verifier.newVerifier({
        stateResolver: resolvers,
        circuitsDir: path.join(__dirname, keyDIR),
        ipfsGatewayURL: "https://ipfs.io",
    });

    try {
        authResponse = await verifier.fullVerify(tokenStr, authRequest, {
            acceptedStateTransitionDelay: 5 * 60 * 1000
        });
    } catch (error) {
        return res.status(500).send(error);
    }
    console.log(authResponse)
    return res
        .status(200)
        .set("Content-Type", "application/json")
        .send(authResponse);
}

app.post("/sign-in", (req, res) => {
    getAuthRequest(req, res);
})

app.post("/callback", callback)

app.use(express.json());


app.listen(PORT, () => {
    console.log("Server Listening on PORT: ", PORT);
})


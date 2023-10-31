// import { fetchJson } from "../src/utils";
const {getAuth} =  require("../api/reddit/auth")


getAuth().then(token => console.log(token))



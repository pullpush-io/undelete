// import { fetchJson } from "../src/utils";
import {getAuth} from  "../api/reddit/auth"

getAuth().then(token => console.log(token))



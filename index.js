
import pkg from 'blaubergopenhabjs'
import fs from 'node:fs';
import axios from 'axios';

const openhabUrl = 'http://192.168.1.2:8080'; // Ersetzen Sie dies durch die IP-Adresse Ihres OpenHAB-Servers
const thingUID = 'mqtt:topic:MQTTBroker:MyThing'; // Ersetzen Sie dies durch die tatsächliche Thing UID
const itemprefix = "MyThing_";
const VentID = '001E00345A345678'; 
const VentIsMaster = true;
const looptime = 5; // seconds to loop the script, 0 to deactivate

const username = 'myuser'; // Ersetzen Sie dies durch Ihren Benutzernamen
const password = 'mysecret'; // Ersetzen Sie dies durch Ihr Passwort

const resource = new pkg.BlaubergVentoResource();
var err_cnt = 0, loop_cnt = 0;

loop_main();

async function loop_main(){
    var val;
    if (looptime == 0){
        sync_main();
    } else {
        while ( true == true ) {
            loop_cnt = loop_cnt + 1;
            await sync_main();
            val = err_cnt / loop_cnt * 100;
            console.log('Loops ' + loop_cnt + ', detected errors: ' + err_cnt + ' - ' + val.toFixed(3) + ' %');
            console.log('');
            await sleep(looptime * 1000);
        } 
    }
}

async function sync_main(){
    var vent_fl, oh_fl, vent_set, vent_vals, oh_set, vent_init, oh_init, vent_res, oh_resset, oh_resval;
    var vent_dev, oh_dev;
    var vent2oh, fl_wrt;
    var err;

    vent_dev = await resource.findById(VentID);

    console.log('---------------------');
    if (vent_dev === null){
        console.error("Vent device could not be found: " + VentID);
        err_cnt = err_cnt + 1;
    } else if (vent_dev.id.length == VentID.length) {
        console.log('Vent found: ' + vent_dev.id);
        vent_fl = vent_dev.id + "_vent.txt";
        vent_init = false;

        if (!fs.existsSync(vent_fl)){ // Vent file exisitiert nicht
            console.warn("  Vent file not existing, creating ... ");
            vent_set = true;
            vent_vals = true;
            vent_init = true;
        } else {
            vent_set = dev_change_in_settings(vent_dev, vent_fl);
            vent_vals = dev_change_in_values(vent_dev, vent_fl);
            if (vent_set){
                console.log("  Changes in vent settings detected *");
            } else {
                console.log("  No changes in vent settings detected");
            }
            if (vent_vals){
                console.log("  Changes in vent values detected *");
            } else {
                console.log("  No changes in vent values detected");
            }
        }

        oh_dev = await blaubergvento_openhab_get_thing(thingUID);
        oh_init = false;

        if (typeof(oh_dev.id) == 'undefined') {
            console.error("OpenHAB thing could not be found: " + thingUID);
            err_cnt = err_cnt + 1;
        } else if (oh_dev.id == 'NULL') {
            console.log("Valid OpenHAB thing found: " + oh_dev.id);
            console.warn("  OpenHAB thing not initialized (is NULL): " + thingUID);
            vent2oh = 1;
            oh_set = true;
            oh_init = true;
            oh_fl = oh_dev.id + "_oh.txt";
        } else { // hier beginnt der eigentliche Code zur Unterscheidung der Synchronisation
            console.log("Valid OpenHAB thing found: " + oh_dev.id);
            oh_fl = oh_dev.id + "_oh.txt";
            if (!fs.existsSync(oh_fl)){
                console.warn("  OpenHAB file not existing, creating ... ");
                oh_init = true;
            } else {
                oh_set = dev_change_in_settings(oh_dev, oh_fl);
                if (oh_set){
                    console.log("  Changes in OpenHAB settings detected *");
                } else {
                    console.log("  No changes in OpenHAB settings detected");
                }
            }
            vent2oh = 0;
            if (VentIsMaster) {
                if (vent_set) {
                    vent2oh = 1;
                } else if (oh_set) {
                    vent2oh = 2;
                }
            } else {
                if (oh_set) {
                    vent2oh = 2;
                } else if (vent_set) {
                    vent2oh = 1;
                }
            }

            console.log('');
            fl_wrt = false;
            // Values transferieren von Vent nach Openhab
            if (vent_vals || vent_init || oh_init) {
                console.log("Transfering values to OpenHAB");
                oh_dev.id = vent_dev.id;
                oh_dev.ipAddress = vent_dev.ipAddress;
                oh_dev.humidity = vent_dev.humidity;
                oh_dev.filterAlarm = vent_dev.filterAlarm;
                oh_resval = await blaubergvento_openhab_set_thing(thingUID, oh_dev, false);
                if (oh_resval){
                    fl_wrt = true;
                    console.log("  --> successfull");
                } else {
                    console.error("  --> not successfull");
                    err_cnt = err_cnt + 1;
                }
            } else {
                console.log("No values to transfer to OpenHAB");
            }

            // Setting transferieren von Vent nach Openhab
            if (vent2oh == 1 || vent_init || oh_init) {
                console.log("Syncing settings from vent to OpenHAB");
                oh_dev.on = vent_dev.on;
                oh_dev.ventilationmode = vent_dev.ventilationmode;
                oh_dev.weeklyschedule = vent_dev.weeklyschedule;
                oh_dev.speed = vent_dev.speed;
                oh_dev.manualSpeed = vent_dev.manualSpeed;
                oh_resset = await blaubergvento_openhab_set_thing(thingUID, oh_dev, true);
                if (oh_resset){
                    fl_wrt = true;
                    console.log("  --> successfull");
                } else {
                    console.error("  --> not successfull");
                    err_cnt = err_cnt + 1;
                }
            } else if (vent2oh == 2) {
                console.log("Syncing settings from OpenHAB to vent");
                vent_dev.on = oh_dev.on;
                vent_dev.ventilationmode = oh_dev.ventilationmode;
                vent_dev.weeklyschedule = oh_dev.weeklyschedule;
                vent_dev.speed = oh_dev.speed;
                vent_dev.manualSpeed = oh_dev.manualSpeed;
                //console.warn("Simuliere Speicherung in Vent");
                resource.save(vent_dev);
                fl_wrt = true;
                // Successfull implementieren
            } else if (vent2oh == 0) {
                console.log("No synchronisation of settings required");
            } else {
                console.log('Some ERROR');
                err_cnt = err_cnt + 1;
            }

            if (fl_wrt){
                console.log('');
                console.log("Saving vent file");
                device2file(vent_dev, vent_fl);
                console.log("Saving OpenHAB file");
                device2file(oh_dev, oh_fl);
            }
       }

    } else {
        console.error('Some error');
        err_cnt = err_cnt + 1;
    }
    console.log('');
}

function dev_change_in_settings(dev, fl){
    var err;
    var cnt_vent;
    var res = false;
    var devfl = new pkg.Device();
    
    if (fs.existsSync(fl)){
        cnt_vent = fs.readFileSync(fl, 'utf8', err)
        devfl = JSON.parse(cnt_vent);

        if (dev.on != devfl.on) {
            res = true;
            console.log ("    Change in value detected: on");
        } else if (dev.speed != devfl.speed) {
            res = true;
            console.log ("    Change in value detected: speed");
        } else if (dev.manualSpeed != devfl.manualSpeed) {
            res = true;
            console.log ("    Change in value detected: manualSpeed");
        } else if (dev.weeklyschedule != devfl.weeklyschedule) {
            res = true;
            console.log ("    Change in value detected: weeklyschedule");
        } else if (dev.ventilationmode != devfl.ventilationmode) {
            res = true;
            console.log ("    Change in value detected: ventilationmode");
        }
    } else {
        res = true;
    }

    return res;  
}

function dev_change_in_values(dev, fl){
    var err;
    var cnt_vent
    var res = false;
    var devfl = new pkg.Device();
    
    if (fs.existsSync(fl)){
        cnt_vent = fs.readFileSync(fl, 'utf8', err)
        devfl = JSON.parse(cnt_vent);

        if (dev.filterAlarm != devfl.filterAlarm) {
            res = true;
            console.log ("    Change in value detected: filterAlarm");
        } else if (dev.humidity != devfl.humidity) {
            res = true;
            console.log ("    Change in value detected: humidity");
        } else if (dev.ipAddress != devfl.ipAddress) {
            res = true;
            console.log ("    Change in value detected: ipAddress");
        } else if (dev.id != devfl.id) {
            res = true;
            console.log ("    Change in value detected: id");
        }
    } else {
        res = true;
    }

    return res;  
}

async function blaubergvento_openhab_set_thing(thg, dev, setgs) {
    var err;
    var itm, val, res_all, res;
    
    res_all = true;
    try {
        const response = await axios.get(`${openhabUrl}/rest/things/${thg}`, {
            auth: {
                username: username,
                password: password
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        for (const obj of response.data.channels) {
            itm = obj.linkedItems[0];
            res = true;
            if (setgs) {
                switch (itm) {
                    case itemprefix + "on":
                        res = await blaubergvento_openhab_set_item(itemprefix + "on", dev.on, obj.itemType);
                        break;
                    case itemprefix + "ventilationmode":
                        res = await blaubergvento_openhab_set_item(itemprefix + "ventilationmode", dev.ventilationmode, obj.itemType);
                        break;
                    case itemprefix + "weeklyschedule":
                        res = await blaubergvento_openhab_set_item(itemprefix + "weeklyschedule", dev.weeklyschedule, obj.itemType);
                        break;
                    case itemprefix + "speed":
                        res = await blaubergvento_openhab_set_item(itemprefix + "speed", dev.speed, obj.itemType);
                        break;
                    case itemprefix + "manualspeed":
                        res = await blaubergvento_openhab_set_item(itemprefix + "manualspeed", dev.manualSpeed, obj.itemType);
                        break;
                }
            } else {
                switch (itm) {
                    case itemprefix + "ID":
                        res = await blaubergvento_openhab_set_item(itemprefix + "ID", dev.id, obj.itemType);
                        break;
                    case itemprefix + "IP":
                        res = await blaubergvento_openhab_set_item(itemprefix + "IP", dev.ipAddress, obj.itemType);
                        break;
                    case itemprefix + "humidity":
                        res = await blaubergvento_openhab_set_item(itemprefix + "humidity", dev.humidity, obj.itemType);
                        break;
                     case itemprefix + "filteralarm":
                        res = await blaubergvento_openhab_set_item(itemprefix + "filteralarm", dev.filterAlarm, obj.itemType);
                        break;
                }
            }
            if (!res) {
                res_all = false;
            }
        }

    } catch (err) {
        console.error('  Error requesting OpenHAB thing:', thg);
        console.error('    ' + err.message);
        res_all = false;
    }

    return res_all;
}

async function blaubergvento_openhab_set_item(nm, val, tp) {
    var err;
    var nval, res;
    res = false;

    try {
        switch (tp) {
            case 'Number':
                nval = val.toString();
                break;
            case 'Switch':
                if (val)
                    nval = 'ON';
                else
                    nval = 'OFF';
                break;
            default:
                nval = val;
        }
        const response = await axios.post(`${openhabUrl}/rest/items/${nm}`, nval, {
            auth: {
                username: username,
                password: password
            },
            headers: {
                'Content-Type': 'text/plain',
                'Accept': 'application/json'
            }
        });
        if (response.status === 200) {
            console.log('    Response OK, item', nm, ', value', nval, ', type', tp);
            res = true;
        } else {
            console.error(`    Response status: ${response.status}`);
            console.error('      item', nm, ', value', nval, ', type', tp);
        }
    } catch (err) {
        console.error('    Error setting item', nm, 'value in Openhab: ', err.message);
        console.error('      item', nm, ', value', nval, ', type', tp);
    }

    return res;
}

async function blaubergvento_openhab_get_thing(thg) {
    var err;
    const rdev = new pkg.Device();
    var itm, val;
   
    try {
        const response = await axios.get(`${openhabUrl}/rest/things/${thg}`, {
            auth: {
                username: username,
                password: password
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        // Ausgabe des JSON des Things
        // console.log('Thing JSON:', JSON.stringify(response.data, null, 2));
        for (const obj of response.data.channels) {
            itm = obj.linkedItems[0];
            val = await blaubergvento_openhab_get_item(itm, obj.itemType);
            //console.log(`ID: ${obj.id}, Linked_Item: ${itm}, Value: ${val}`);
            switch (itm) {
                case itemprefix + "ID":
                    rdev.id = val;
                    break;
                case itemprefix + "IP":
                    rdev.ipAddress = val;
                    break;
                case itemprefix + "on":
                    rdev.on = val;
                    break;
                case itemprefix + "humidity":
                    rdev.humidity = val;
                    break;
                case itemprefix + "ventilationmode":
                    rdev.ventilationmode = val;
                    break;
                case itemprefix + "weeklyschedule":
                    rdev.weeklyschedule = val;
                    break;
                case itemprefix + "speed":
                    rdev.speed = val;
                    break;
                case itemprefix + "manualspeed":
                    rdev.manualSpeed = val;
                    break;
                case itemprefix + "filteralarm":
                    rdev.filterAlarm = val;
                    break;
                default:
                    console.log("Invalid item");
            }
        }

        return rdev;
    } catch (err) {
        console.error('  Error requesting OpenHAB thing:', thg);
        console.error('    ' + err.message);
        return rdev;
   }
}

async function blaubergvento_openhab_get_item(nm, tp) {
    var err;
    var erg;
    var val, nval;
    erg = "";

    try {
        const response = await axios.get(`${openhabUrl}/rest/items/${nm}`, {
            auth: {
                username: username,
                password: password
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        // console.log('Thing JSON:', JSON.stringify(response.data, null, 2));
        val = response.data.state;
        switch (tp) {
            case 'Number':
                nval = val;
                break;
            case 'Switch':
                if (val == 'ON')
                    nval = true;
                else
                    nval = false;
                break;
            default:
                nval = val;
        }
        return nval;
    } catch (err) {
        console.error('Fehler beim Abrufen des Items: ', err.message);
    }
}

function device2file_return_change(dev, fl){
    var err;
    var txt_vent, cnt_vent
    var res = true;
    
    txt_vent = JSON.stringify(dev);

    if (fs.existsSync(fl)){
        console.log ("Reading existing file " + fl);
        cnt_vent = fs.readFileSync(fl, 'utf8', err)
        //console.log (txt_vent);
        //console.log (cnt_vent);
        if (txt_vent == cnt_vent) {
            console.log ("  No change");
        } else {
            console.log ("  Writing changes");
            fs.writeFileSync(fl, txt_vent, err);
        }
    } else {
        console.log ("  Creating file " + fl);
        fs.writeFileSync(fl, txt_vent, err);
    } 
    return res;  
}

function device2file(dev, fl){
    var err;
    var txt, cnt_vent
    
    txt = JSON.stringify(dev);
    fs.writeFileSync(fl, txt, err);
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
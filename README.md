# Introduction

This is a JS module synchronizing a Blauberg Vento Fan with OpenHAB instance. It is based on the JS Library andypmuc/blaubergopenhabjs which offers the possibility to send and receive UDP Packages to the Blauberg Vento Fan. I created a separate OpenHAB indepentent file, as you can run it via cronjob anywhere. You can also run a infinite loop to test it and see the errors during transfer and synchronization.

This is the first draft and everyone is invited to participated.

## Installation

Download the files and execute npm install in the directory to download the libraries. (Install JS Node first)

Configure the script variables in the first lines.

Create an OpenHAB thing according to the thing code below.

Create items for the required channels. It is important the endings of the items fit and capital letters are considered, as the script consideres the endings.

Create state descriptions according to the description below.

Start the script an monitor the output for errors. Check, whether it works.

If you like, define rules in OpenHAB, if values are changed, that the script is executed immediately. Otherwise you will have some delay due to the cronjob interval.

## MyThing Code

```
UID: mqtt:topic:NASMQTTBroker:MyThing
label: MyThing
thingTypeUID: mqtt:topic
configuration: {}
bridgeUID: mqtt:broker:NASMQTTBroker
channels:
  - id: MyThing_ID
    channelTypeUID: mqtt:string
    label: MyThing_ID
    description: null
    configuration: {}
  - id: MyThing_IP
    channelTypeUID: mqtt:string
    label: MyThing_IP
    description: null
    configuration: {}
  - id: MyThing_humidity
    channelTypeUID: mqtt:number
    label: MyThing_humidity
    description: Value of humidity sensor
    configuration: {}
  - id: MyThing_on
    channelTypeUID: mqtt:switch
    label: MyThing_on
    description: null
    configuration: {}
  - id: MyThing_ventilationmode
    channelTypeUID: mqtt:number
    label: MyThing_ventilationmode
    description: null
    configuration: {}
  - id: MyThing_weeklyschedule
    channelTypeUID: mqtt:number
    label: MyThing_weeklyschedule
    description: null
    configuration: {}
  - id: MyThing_speed
    channelTypeUID: mqtt:number
    label: MyThing_speed
    description: null
    configuration: {}
  - id: MyThing_manualspeed
    channelTypeUID: mqtt:number
    label: MyThing_manualspeed
    description: null
    configuration: {}
  - id: MyThing_filteralarm
    channelTypeUID: mqtt:switch
    label: MyThing_filteralarm
    description: null
    configuration: {}
```

## State descriptions for the items

```
MyThing_speed
255 = Manuell
1 = Langsam
2 = Mittel
3 = Schnell

MyThing_ventilationmode
0 = Lüftung
1 = Wärmerückgewinnung
2 = Luftzufuhr

MyThing_weeklyschedule
0 = Aus
1 = Ein

```

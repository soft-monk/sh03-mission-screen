// 由 _tools/gen-data.mjs 从 mission-app/data/scenario-1 生成，请勿手改
window.SCENARIO = {
  "mission": {
    "name": "敏捷拒止布控（演示）",
    "type": "侦察/打击",
    "region": "西南方向山区",
    "startAt": "2026-09-16 15:14",
    "timeRequirement": "自任务下达起 4 小时内完成侦察与处置"
  },
  "center": [
    116.574,
    39.77
  ],
  "groups": [
    {
      "key": "recon-1",
      "name": "前出侦察集群",
      "role": "recon"
    },
    {
      "key": "recon-2",
      "name": "侧翼侦察集群",
      "role": "recon"
    },
    {
      "key": "radar-1",
      "name": "雷达探测集群",
      "role": "radar"
    },
    {
      "key": "relay-1",
      "name": "通信中继集群",
      "role": "relay"
    },
    {
      "key": "ew-1",
      "name": "电子压制集群",
      "role": "ew"
    },
    {
      "key": "reserve-1",
      "name": "机动预备集群",
      "role": "reserve"
    }
  ],
  "aircraft": [
    {
      "deviceId": "uav-opt-001",
      "typeKey": "optical",
      "groupKey": "recon-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.6,
        39.74
      ],
      "altM": 300,
      "speedMps": 25,
      "battery": 100,
      "loop": true,
      "payload": [
        "camera"
      ],
      "taskArea": "area-c"
    },
    {
      "deviceId": "uav-opt-002",
      "typeKey": "optical",
      "groupKey": "recon-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.602,
        39.742
      ],
      "altM": 300,
      "speedMps": 25,
      "battery": 100,
      "loop": true,
      "payload": [
        "camera"
      ],
      "taskArea": "area-c"
    },
    {
      "deviceId": "uav-opt-003",
      "typeKey": "optical",
      "groupKey": "recon-2",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.616,
        39.738
      ],
      "altM": 320,
      "speedMps": 24,
      "battery": 100,
      "loop": true,
      "payload": [
        "camera"
      ],
      "taskArea": "area-c"
    },
    {
      "deviceId": "uav-opt-004",
      "typeKey": "optical",
      "groupKey": "recon-2",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.618,
        39.74
      ],
      "altM": 320,
      "speedMps": 24,
      "battery": 100,
      "loop": true,
      "payload": [
        "camera"
      ],
      "taskArea": "area-c"
    },
    {
      "deviceId": "uav-rad-001",
      "typeKey": "radar",
      "groupKey": "radar-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.606,
        39.744
      ],
      "altM": 400,
      "speedMps": 22,
      "battery": 100,
      "loop": true,
      "payload": [
        "sar"
      ],
      "taskArea": "area-b"
    },
    {
      "deviceId": "uav-rad-002",
      "typeKey": "radar",
      "groupKey": "radar-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.608,
        39.746
      ],
      "altM": 400,
      "speedMps": 22,
      "battery": 100,
      "loop": true,
      "payload": [
        "sar"
      ],
      "taskArea": "area-b"
    },
    {
      "deviceId": "uav-com-001",
      "typeKey": "comm",
      "groupKey": "relay-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.612,
        39.748
      ],
      "altM": 500,
      "speedMps": 20,
      "battery": 100,
      "loop": true,
      "payload": [
        "relay"
      ],
      "taskArea": "area-b"
    },
    {
      "deviceId": "uav-ew-001",
      "typeKey": "electronic",
      "groupKey": "ew-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.604,
        39.736
      ],
      "altM": 350,
      "speedMps": 23,
      "battery": 100,
      "loop": true,
      "payload": [
        "jammer"
      ],
      "taskArea": "area-a"
    },
    {
      "deviceId": "uav-ew-002",
      "typeKey": "electronic",
      "groupKey": "ew-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.607,
        39.738
      ],
      "altM": 350,
      "speedMps": 23,
      "battery": 100,
      "loop": true,
      "payload": [
        "jammer"
      ],
      "taskArea": "area-a"
    },
    {
      "deviceId": "uav-opt-005",
      "typeKey": "optical",
      "groupKey": "reserve-1",
      "homeArea": "friendly-assembly-a",
      "station": [
        116.62,
        39.732
      ],
      "altM": 300,
      "speedMps": 26,
      "battery": 100,
      "loop": true,
      "payload": [
        "camera"
      ],
      "taskArea": "area-c"
    }
  ],
  "assembly": [
    {
      "key": "friendly-assembly-a",
      "name": "我方集结区 A",
      "role": "assembly",
      "polygon": [
        [
          116.595,
          39.735
        ],
        [
          116.625,
          39.735
        ],
        [
          116.625,
          39.755
        ],
        [
          116.595,
          39.755
        ]
      ]
    },
    {
      "key": "friendly-forward-node",
      "name": "前沿指挥节点",
      "role": "forward-node",
      "position": [
        116.61,
        39.745
      ]
    }
  ],
  "taskAreas": [
    {
      "key": "area-a",
      "name": "A 区",
      "role": "assembly",
      "color": "blue",
      "polygon": [
        [
          116.586,
          39.744
        ],
        [
          116.618,
          39.744
        ],
        [
          116.618,
          39.764
        ],
        [
          116.586,
          39.764
        ]
      ]
    },
    {
      "key": "area-b",
      "name": "B 区",
      "role": "monitor",
      "color": "green",
      "polygon": [
        [
          116.556,
          39.782
        ],
        [
          116.604,
          39.782
        ],
        [
          116.604,
          39.806
        ],
        [
          116.556,
          39.806
        ]
      ]
    },
    {
      "key": "area-c",
      "name": "C 区",
      "role": "hvt",
      "color": "red",
      "polygon": [
        [
          116.528,
          39.752
        ],
        [
          116.568,
          39.752
        ],
        [
          116.568,
          39.776
        ],
        [
          116.528,
          39.776
        ]
      ]
    },
    {
      "key": "area-enemy-deploy",
      "name": "敌方潜在部署区",
      "role": "threat",
      "color": "red",
      "dashed": true,
      "polygon": [
        [
          116.494,
          39.792
        ],
        [
          116.556,
          39.792
        ],
        [
          116.556,
          39.826
        ],
        [
          116.494,
          39.826
        ]
      ]
    }
  ],
  "zones": [
    {
      "key": "nfz-core",
      "name": "核心禁飞区",
      "kind": "no-fly",
      "hardness": "hard",
      "color": "red",
      "polygon": [
        [
          116.56,
          39.764
        ],
        [
          116.582,
          39.764
        ],
        [
          116.582,
          39.78
        ],
        [
          116.56,
          39.78
        ]
      ]
    },
    {
      "key": "threat-sam",
      "name": "威胁区（防空）",
      "kind": "threat",
      "level": "high",
      "color": "orange",
      "polygon": [
        [
          116.54,
          39.784
        ],
        [
          116.568,
          39.784
        ],
        [
          116.568,
          39.798
        ],
        [
          116.54,
          39.798
        ]
      ]
    },
    {
      "key": "geofence-ew",
      "name": "电子围栏",
      "kind": "geofence",
      "action": "warn",
      "color": "yellow",
      "polygon": [
        [
          116.5,
          39.76
        ],
        [
          116.522,
          39.76
        ],
        [
          116.522,
          39.778
        ],
        [
          116.5,
          39.778
        ]
      ]
    },
    {
      "key": "corridor-main",
      "name": "出航通道",
      "kind": "corridor",
      "widthM": 800,
      "color": "cyan",
      "line": [
        [
          116.6,
          39.742
        ],
        [
          116.578,
          39.752
        ],
        [
          116.552,
          39.766
        ]
      ]
    }
  ],
  "targets": [
    {
      "no": 1,
      "typeKey": "cmdNode",
      "name": "机动指挥节点",
      "motion": "static",
      "position": [
        116.542,
        39.762
      ],
      "confidence": 0.92,
      "features": [
        "大型设施",
        "卫星天线",
        "通信设备"
      ],
      "threat": "high",
      "valueTag": "高价值"
    },
    {
      "no": 2,
      "typeKey": "airDefSite",
      "name": "防空火力阵地",
      "motion": "static",
      "position": [
        116.552,
        39.79
      ],
      "confidence": 0.85,
      "features": [
        "发射阵地",
        "雷达车"
      ],
      "threat": "high"
    },
    {
      "no": 3,
      "typeKey": "commNode",
      "name": "通信保障节点",
      "motion": "static",
      "position": [
        116.534,
        39.8
      ],
      "confidence": 0.78,
      "features": [
        "通信设备",
        "天线阵列"
      ],
      "threat": "mid"
    },
    {
      "no": 4,
      "typeKey": "logiUnit",
      "name": "机动运输车队",
      "motion": "dynamic",
      "route": [
        [
          116.56,
          39.76
        ],
        [
          116.548,
          39.768
        ],
        [
          116.536,
          39.776
        ],
        [
          116.526,
          39.784
        ]
      ],
      "speedMps": 12,
      "loop": true,
      "startOffsetMs": 0,
      "confidence": 0.7,
      "features": [
        "车辆活动"
      ],
      "threat": "mid"
    },
    {
      "no": 5,
      "typeKey": "cmdNode",
      "name": "临时指挥点（中途出现）",
      "motion": "popup",
      "position": [
        116.52,
        39.808
      ],
      "startOffsetMs": 60000,
      "confidence": 0.65,
      "features": [
        "临时设施"
      ],
      "threat": "low"
    }
  ],
  "attackStarts": [
    {
      "key": "ip-c-west",
      "name": "IP 点｜C 区西侧攻击起点",
      "lng": 116.552,
      "lat": 39.766,
      "altM": 300
    },
    {
      "key": "ip-c-north",
      "name": "IP 点｜C 区北侧攻击起点",
      "lng": 116.548,
      "lat": 39.774,
      "altM": 320
    },
    {
      "key": "ip-c-east",
      "name": "IP 点｜C 区东侧攻击起点",
      "lng": 116.572,
      "lat": 39.762,
      "altM": 350
    }
  ],
  "assessRoutes": [
    {
      "key": "route-assess-c-west",
      "name": "评估航线｜C 区西侧",
      "waypoints": [
        [
          116.556,
          39.766
        ],
        [
          116.5566,
          39.7544
        ],
        [
          116.548,
          39.756
        ],
        [
          116.5528,
          39.7442
        ],
        [
          116.56,
          39.748
        ]
      ]
    },
    {
      "key": "route-assess-c-north",
      "name": "评估航线｜C 区北侧",
      "waypoints": [
        [
          116.548,
          39.78
        ],
        [
          116.554,
          39.77
        ],
        [
          116.56,
          39.766
        ],
        [
          116.564,
          39.758
        ],
        [
          116.556,
          39.752
        ]
      ]
    },
    {
      "key": "route-assess-c-east",
      "name": "评估航线｜C 区东侧",
      "waypoints": [
        [
          116.578,
          39.76
        ],
        [
          116.582,
          39.7564
        ],
        [
          116.574,
          39.756
        ],
        [
          116.566,
          39.748
        ],
        [
          116.56,
          39.748
        ]
      ]
    }
  ]
};

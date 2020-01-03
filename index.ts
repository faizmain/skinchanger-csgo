const memoryJs = require("memoryjs");
const request = require("request-promise");

class Skinchanger {
  offsets!: any
  client: any;
  engine: any;
  skinChangerInterval: NodeJS.Timer;
  skins: any;
  process: any;

  constructor() {
    this.skinChangerInterval = null;
    this.process = null;
    this.client = null;
    this.engine = null;
    this.offsets = null;
    this.skins = {
      awp: {
        id: 9,
        paintkit: 344,
        seed: 1,
        wear: 0.01,
        stattrak: 1,
      },
      knife1: {
        id: 515,
        paintkit: 344,
        seed: 1,
        wear: 0.01,
        stattrak: 1,
      },
    };
    
    this.start();
  }

  async start() {
    await this.dumpOffsets();
 
    try {
      this.process = memoryJs.openProcess("csgo.exe");
      memoryJs.setProtection(this.process.handle, 0x00FE102D, 4, memoryJs.PAGE_EXECUTE_READWRITE);

      memoryJs.findModule("engine.dll", this.process.th32ProcessID, (error: string, module: any) => {
        this.engine = module;
      })
      memoryJs.findModule("client_panorama.dll", this.process.th32ProcessID, (error: string, module: any) => {
        this.client = module;
        this.init();
      })
    } catch (e) {
      if (this.engine) {
        clearInterval(this.skinChangerInterval);
        this.skinChangerInterval = null;
        this.engine = null;
        this.client = null;
      }
    }
  }
  async init() {
    const dwLocalPlayer = memoryJs.readMemory(this.process.handle, this.client.modBaseAddr + this.offsets.dwLocalPlayer, memoryJs.INT);

    for (let i = 0; i != 8; i++) { 
      const iWeaponIndex = memoryJs.readMemory(this.process.handle, dwLocalPlayer + this.offsets.m_hMyWeapons + ((i - 1) * 0x4), memoryJs.INT) & 0xFFF;
      const iWeaponEntity = memoryJs.readMemory(this.process.handle, this.client.modBaseAddr + this.offsets.dwEntityList + (iWeaponIndex - 1) * 0x10, memoryJs.INT);

      const iWeaponID = memoryJs.readMemory(this.process.handle, iWeaponEntity + this.offsets.m_iItemDefinitionIndex, memoryJs.INT);
      const iPaintKit = memoryJs.readMemory(this.process.handle, iWeaponEntity + this.offsets.m_nFallbackPaintKit, memoryJs.INT);
      const iXuid = memoryJs.readMemory(this.process.handle, iWeaponEntity + this.offsets.m_OriginalOwnerXuidLow, memoryJs.INT);
      if (iWeaponID <= 0) continue;


      for (const key in this.skins) {
        const skin = this.skins[key];
        if (iWeaponID === 9 && iPaintKit != skin.paint1kit) {
          console.log(iPaintKit)
          console.log(iWeaponID)
          this.setSkin(iWeaponEntity, skin.seed, skin.wear, skin.paintkit, skin.stattrak, iXuid);
        }
      }
    }
  }
  async setSkin(weaponEntity: number, seed: number, wear: number, paintKit: number, stattrak: number, accountId: number) {
    memoryJs.writeMemory(this.process.handle, weaponEntity + this.offsets.m_iItemIDHigh, -1, "int");
    memoryJs.writeMemory(this.process.handle, weaponEntity + this.offsets.m_nFallbackPaintKit, paintKit, "uint64");
  }
  async dumpOffsets() {
    const offsets = await request("https://raw.githubusercontent.com/frk1/hazedumper/master/csgo.json");

    this.offsets = JSON.parse(offsets);
    this.offsets = Object.assign({}, this.offsets.signatures, this.offsets.netvars);
  }
  async load() {
    this.skinChangerInterval = setInterval(this.start, 1000);
  }
}

export default new Skinchanger()
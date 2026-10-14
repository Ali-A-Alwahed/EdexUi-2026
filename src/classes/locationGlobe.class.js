class LocationGlobe {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        const path = require("path");

        this._geodata = require(path.join(__dirname, "assets/misc/grid.json"));
        require(path.join(__dirname, "assets/vendor/encom-globe.js"));
        this.ENCOM = window.ENCOM;

        // Create DOM and include lib
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_globe">
            <div id="mod_globe_innercontainer">
                <h1>WORLD VIEW<i>GLOBAL NETWORK MAP</i></h1>
                <h2>ENDPOINT LAT/LON<i class="mod_globe_headerInfo">0.0000, 0.0000</i></h2>
                <div id="mod_globe_canvas_placeholder"></div>
                <h3>OFFLINE</h3>
            </div>
        </div>`;

        this.lastgeo = {};
        this.conns = [];

        // Called when the 3D globe cannot run. Keeps the module header and the
        // rest of the interface intact while explaining why nothing is drawn.
        this._fallbackNoWebGL = (container, placeholder, reason) => {
            if (!container || !placeholder) return;
            placeholder.classList.add("mod_globe_unavailable");
            placeholder.innerHTML = `<div class="mod_globe_unsupported">
                <span class="mod_globe_unsupported_title">GLOBE UNAVAILABLE</span>
                <span class="mod_globe_unsupported_reason">${reason}</span>
            </div>`;
            // Everything below expects a live globe, so mark it unusable.
            this.globe = null;
        };

        // True while the globe is running. Every method that touches the 3D
        // scene checks this first, so the module degrades to a no-op instead of
        // throwing once WebGL has been ruled out.
        this.isAvailable = () => !!this.globe;


        setTimeout(() => {
            let container = document.getElementById("mod_globe_innercontainer");
            let placeholder = document.getElementById("mod_globe_canvas_placeholder");

            // WebGL is unavailable on some machines (software rendering, disabled
            // GPU, blocklisted drivers). In that case the globe cannot render, so
            // fall back to a static placeholder instead of crashing the window.
            if (typeof WebGLRenderingContext === "undefined") {
                return this._fallbackNoWebGL(container, placeholder, "WebGL is not available on this system.");
            }

            let globeInstance;
            try {
                // The placeholder reserves its box with "height: 0" plus
                // "padding-bottom: 100%", so offsetHeight is literally 0. A
                // zero-height canvas cannot get a WebGL context and the globe
                // silently fails to initialise. Derive a real size from the
                // width instead (and never pass 0, which WebGL rejects).
                const width = placeholder.offsetWidth || container.offsetWidth || 400;
                const height = Math.round(width) || 400;

                globeInstance = new this.ENCOM.Globe(width, height, {
                    font: window.theme.cssvars.font_main,
                    data: [],
                    tiles: this._geodata.tiles,
                    baseColor: window.theme.globe.base || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                    markerColor: window.theme.globe.marker || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                    pinColor: window.theme.globe.pin || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                    satelliteColor: window.theme.globe.satellite || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                    scale: 1.1,
                    viewAngle: 0.630,
                    dayLength: 1000 * 45,
                    introLinesDuration: 2000,
                    introLinesColor: window.theme.globe.marker || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                    maxPins: 300,
                    maxMarkers: 100
                });
            } catch (e) {
                console.error("Globe failed to initialise:", e);
                return this._fallbackNoWebGL(container, placeholder, "Could not start the 3D globe on this system.");
            }

            // The Globe object wraps a THREE.WebGLRenderer. That renderer is the
            // thing that reports WebGL availability, so check it rather than the
            // Globe wrapper, which has no context/supported of its own.
            const renderer = globeInstance && globeInstance.renderer;
            if (!globeInstance || !renderer || renderer.supported === false || !renderer.context) {
                return this._fallbackNoWebGL(container, placeholder, "The 3D globe needs GPU/WebGL support.");
            }

            this.globe = globeInstance;

            placeholder.remove();
            container.append(this.globe.domElement);

            this._animate = () => {
                if (document.hidden) {
                    requestAnimationFrame(window.mods.globe._animate);
                    return;
                }
                if (window.mods.globe.globe) {
                    window.mods.globe.globe.tick();
                }
                if (window.mods.globe._animate) {
                    setTimeout(() => {
                        try {
                            requestAnimationFrame(window.mods.globe._animate);
                        } catch(e) {
                            console.warn(e);
                        }
                    }, 1000 / 24);
                }
            };
            this.globe.init(window.theme.colors.light_black, () => {
                this._animate();
                window.audioManager.scan.play();
            });

            this.resizeHandler = () => {
                let canvas = document.querySelector("div#mod_globe canvas");
                if (!canvas || !window.mods.globe.globe) return;
                window.mods.globe.globe.camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
                window.mods.globe.globe.camera.updateProjectionMatrix();
                window.mods.globe.globe.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
            };
            window.addEventListener("resize", this.resizeHandler);

            this.conns = [];
            this.addConn = ip => {
                let data = null;
                try {
                    data = window.mods.netstat.geoLookup.get(ip);
                } catch {
                    // do nothing
                }
                let geo = (data !== null ? data.location : {});
                if (geo.latitude && geo.longitude) {
                    const lat = Number(geo.latitude);
                    const lon = Number(geo.longitude);
                    window.mods.globe.conns.push({
                        ip,
                        pin: window.mods.globe.globe.addPin(lat, lon, "", 1.2),
                    });
                }
            };
            this.removeConn = ip => {
                if (!this.isAvailable()) return;
                let index = this.conns.findIndex(x => x.ip === ip);
                if (index === -1) return;
                this.conns[index].pin.remove();
                this.conns.splice(index, 1);
            };

            if (!this.isAvailable()) return;

            let constellation = [];
            for(var i = 0; i< 2; i++){
                for(var j = 0; j< 3; j++){
                    constellation.push({
                        lat: 50 * i - 30 + 15 * Math.random(),
                        lon: 120 * j - 120 + 30 * i,
                        altitude: Math.random() * (1.7 - 1.3) + 1.3
                    });
                }
            }

            this.globe.addConstellation(constellation);
        }, 2000);

        // Init updaters when intro animation is done
        setTimeout(() => {
            this.updateLoc();
            this.locUpdater = setInterval(() => {
                this.updateLoc();
            }, 1000);

            this.updateConns();
            this.connsUpdater = setInterval(() => {
                this.updateConns();
            }, 3000);
        }, 4000);
    }

    addRandomConnectedMarkers() {
        if (!this.isAvailable()) return;
        const randomLat = this.getRandomInRange(40, 90, 3);
        const randomLong = this.getRandomInRange(-180, 0, 3);
        this.globe.addMarker(randomLat, randomLong, '');
        this.globe.addMarker(randomLat - 20, randomLong + 150, '', true);
    }
    addTemporaryConnectedMarker(ip) {
        if (!this.isAvailable()) return;
        let data = window.mods.netstat.geoLookup.get(ip);
        let geo = (data !== null ? data.location : {});
        if (geo.latitude && geo.longitude) {
            const lat = Number(geo.latitude);
            const lon = Number(geo.longitude);

            window.mods.globe.conns.push({
                ip,
                pin: window.mods.globe.globe.addPin(lat, lon, "", 1.2)
            });
            let mark = window.mods.globe.globe.addMarker(lat, lon, '', true);
            setTimeout(() => {
                mark.remove();
            }, 3000);
        }
    }
    removeMarkers() {
        if (!this.isAvailable()) return;
        this.globe.markers.forEach(marker => { marker.remove(); });
        this.globe.markers = [];
    }
    removePins() {
        if (!this.isAvailable()) return;
        this.globe.pins.forEach(pin => {
            pin.remove();
        });
        this.globe.pins = [];
    }
    getRandomInRange(from, to, fixed) {
        return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    }
    updateLoc() {
        if (!this.isAvailable()) return;
        if (window.mods.netstat.offline) {
            document.querySelector("div#mod_globe").setAttribute("class", "offline");
            document.querySelector("i.mod_globe_headerInfo").innerText = "(OFFLINE)";

            this.removePins();
            this.removeMarkers();
            this.conns = [];
            this.lastgeo = {
                latitude: 0,
                longitude: 0
            };
        } else {
            this.updateConOnlineConnection().then(() => {
                document.querySelector("div#mod_globe").setAttribute("class", "");
            }).catch(() => {
                document.querySelector("i.mod_globe_headerInfo").innerText = "UNKNOWN";
            })
        }
    }
    async updateConOnlineConnection() {
        if (!window.mods.netstat.ipinfo || !window.mods.netstat.ipinfo.geo) {
            throw new Error("GeoIP data unavailable");
        }

        let newgeo = window.mods.netstat.ipinfo.geo;
        newgeo.latitude = Math.round(newgeo.latitude*10000)/10000;
        newgeo.longitude = Math.round(newgeo.longitude*10000)/10000;

        if (newgeo.latitude !== this.lastgeo.latitude || newgeo.longitude !== this.lastgeo.longitude) {

            document.querySelector("i.mod_globe_headerInfo").innerText = `${newgeo.latitude}, ${newgeo.longitude}`;
            this.removePins();
            this.removeMarkers();
            //this.addRandomConnectedPoints();
            this.conns = [];

            this._locPin = this.globe.addPin(newgeo.latitude, newgeo.longitude, "", 1.2);
            this._locMarker = this.globe.addMarker(newgeo.latitude, newgeo.longitude, "", false, 1.2);
        }

        this.lastgeo = newgeo;
        document.querySelector("div#mod_globe").setAttribute("class", "");
    }
    updateConns() {
        if (!this.isAvailable()) return;
        if (!window.mods.globe.globe || window.mods.netstat.offline) return false;
        window.si.networkConnections().then(conns => {
            let newconns = [];
            conns.forEach(conn => {
                let ip = conn.peeraddress;
                let state = conn.state;
                if (state === "ESTABLISHED" && ip !== "0.0.0.0" && ip !== "127.0.0.1" && ip !== "::") {
                    newconns.push(ip);
                }
            });

            this.conns.forEach(conn => {
                if (newconns.indexOf(conn.ip) !== -1) {
                    newconns.splice(newconns.indexOf(conn.ip), 1);
                } else {
                    this.removeConn(conn.ip);
                }
            });

            newconns.forEach(ip => {
                this.addConn(ip);
            });
        });
    }
}

module.exports = {
    LocationGlobe
};

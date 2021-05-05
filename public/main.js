/*global UIkit, Vue */

(() => {
  const notification = (config) =>
    UIkit.notification({
      pos: "top-right",
      timeout: 5000,
      ...config,
    });

  const alert = (message) =>
    notification({
      message,
      status: "danger",
    });

  const info = (message) =>
    notification({
      message,
      status: "success",
    });

  new Vue({
    el: "#app",
    data: {
      desc: "",
      activeTimers: [],
      oldTimers: [],
      wsClient: null,
    },
    methods: {
      createTimer() {
        const description = this.desc;

        try {
          this.wsClient.send(
            JSON.stringify({
              type: "add_timer",
              description,
            })
          );
        } catch (err) {
          alert(err.message);
        }
      },
      stopTimer(id) {
        try {
          this.wsClient.send(
            JSON.stringify({
              type: "stop_timer",
              id,
            })
          );
          info(`Stopped the timer [${id}]`);
        } catch (err) {
          alert(err.message);
        }
      },
      formatTime(ts) {
        return new Date(ts).toTimeString().split(" ")[0];
      },
      formatDuration(d) {
        d = Math.floor(d / 1000);
        const s = d % 60;
        d = Math.floor(d / 60);
        const m = d % 60;
        const h = Math.floor(d / 60);
        return [h > 0 ? h : null, m, s]
          .filter((x) => x !== null)
          .map((x) => (x < 10 ? "0" : "") + x)
          .join(":");
      },
    },
    created() {
      const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
      const client = new WebSocket(`${wsProto}//${location.host}`);
      this.wsClient = client;

      client.addEventListener("message", (message) => {
        let data;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }

        if (data.type === "all_timers") {
          if (data.isActive === true) {
            this.activeTimers = data.timers;
          }

          if (data.isActive === false) {
            this.oldTimers = data.timers;
          }

          if (data.newTimerId) {
            info(`Created new timer "${this.desc}" [${data.newTimerId}]`);
            this.desc = "";
          }
        }
      });
    },
  });
})();

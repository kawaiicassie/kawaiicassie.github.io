export async function onRequestGet() {
    const max = 267;
    return new Response(await fetch(`https://raw.githubusercontent.com/kawaiicassie/waifu/main/${Math.ceil(Math.random() * max)}.png`).then(r => r.blob()), {
        headers: {
            'content-type': 'image/png',
            'cache-control': 'no-cache, no-store, must-revalidate, max-age=0'
        }
    });
}

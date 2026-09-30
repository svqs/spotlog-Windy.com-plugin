<!-- Spotlog's little pixel star: a four-point sparkle drawn in round dots, like the Doto wordmark -->
<svg class="star" width={ size } height={ size } viewBox="0 0 7 7" aria-hidden="true">
    {#each DOTS as [x, y]}<circle cx={ x + 0.5 } cy={ y + 0.5 } r="0.42" fill="currentColor" />{/each}
</svg>

<script lang="ts">
    export let size: number | string = 16;
    // 7×7 grid:   . . . # . . .
    //             . . . # . . .
    //             . . # # # . .
    //             # # # # # # #
    //             . . # # # . .
    //             . . . # . . .
    //             . . . # . . .
    const ROWS = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
    const DOTS: [number, number][] = [];
    ROWS.forEach((r, y) => [...r].forEach((c, x) => c === '#' && DOTS.push([x, y])));
</script>

<style>
    .star { display: inline-block; flex-shrink: 0; color: #d49500; }
</style>

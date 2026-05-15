# Benchmark Results

Source: `/mnt/disk1/home/adam/dev/innovation/TypeScriptC/manual-tests/benchmarks/results-e2e-full.json`
Generated from benchmark run: `2026-05-15T19:51:12.330Z`
Benchmark source: `e2e`
Runs per backend: `1`
TSC2C flags: `--no-gc`

Lower milliseconds are faster. `vs bun` and `vs node` are the factors by which `tsc2c` is faster, calculated as `backend_ms / tsc2c_ms`.

<div style="overflow-x: auto;">
<table style="table-layout: auto; width: max-content;">
  <colgroup>
    <col style="min-width: 70ch;">
    <col style="width: 7rem;">
    <col style="width: 7rem;">
    <col style="width: 7rem;">
    <col style="width: 6rem;">
    <col style="width: 6rem;">
  </colgroup>
  <thead>
    <tr>
      <th align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>Benchmark</th>
      <th align="right" style="white-space: nowrap;" nowrap>tsc2c ms</th>
      <th align="right" style="white-space: nowrap;" nowrap>bun ms</th>
      <th align="right" style="white-space: nowrap;" nowrap>node ms</th>
      <th align="right" style="white-space: nowrap;" nowrap>vs bun</th>
      <th align="right" style="white-space: nowrap;" nowrap>vs node</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>advanced</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.15x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>aggregate error constructor</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>arith</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.59x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.46x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array at</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.82x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.40x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array concat values</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.65x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array copy within</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.89x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array fill</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.09x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.43x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array find last</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.91x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array flat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.27x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.52x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from dynamic mapper</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.46x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.46x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from map</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.99x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from mapper</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.23x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.12x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from set</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.90x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.21x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array hof</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.46x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.34x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array includes same value zero</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.21x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.69x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array is array narrowing</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.83x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array keys values</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array last index of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.51x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.13x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.46x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array own properties</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.24x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array property descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.62x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array reduce no initial</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array reduce right</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.09x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.04x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array search from index</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.61x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.43x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array sort default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.20x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.12x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array static dynamic</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.36x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.35x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to reversed</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.37x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to sorted</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.39x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to spliced</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.89x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.71x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.58x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array value of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.00x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.87x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array with</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.73x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.95x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>arrays</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async await immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async await try catch</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async await values immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.01x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.31x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async function immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async function values immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.87x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async methods immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async throw rejection</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>base64 globals</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.31x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.95x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>bigint</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.13x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.36x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>bitwise assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.81x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.90x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.42x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer alloc unsafe</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.24x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.81x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer base64</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.01x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.96x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer concat length</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.47x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.05x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer copy</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.89x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer fill</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer float io</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.73x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.95x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer from buffer</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.51x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer int io</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.22x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.39x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.32x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.73x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer search</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.97x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer search more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.10x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer static more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.63x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer swap</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer to json</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.56x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer uint multi io</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.52x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer uint8 io</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.64x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer write</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.42x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.42x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>call arg order</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.34x</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.90x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>captures</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.71x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process argv0 options</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process env options</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callback encoding</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>31.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callback error</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callback timeout</td>
    <td align="right" style="white-space: nowrap;" nowrap>103.6</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callbacks</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>31.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.61x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callbacks cwd</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.45x</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.99x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file callback error</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file callback no args</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file shell</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>34.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.42x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync cwd</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.39x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync input</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync options second arg</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>22.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.82x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync stderr pipe</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.49x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec shell string</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.44x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.32x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync buffer encoding</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.49x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync encoding</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.83x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync options</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>32.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.52x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync timeout options</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process max buffer options</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process numeric kill signal</td>
    <td align="right" style="white-space: nowrap;" nowrap>2011</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process options second arg</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process shell false</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process shell string</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>31.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.09x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.93x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync cwd</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>20.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>33.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.79x</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync detached</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>33.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync detached false</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>20.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>34.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.98x</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync exec error</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync input</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync kill signal</td>
    <td align="right" style="white-space: nowrap;" nowrap>53.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync nonzero status</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.38x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync result metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>17.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.98x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync shell</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync signal</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.92x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio default entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>20.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.87x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio fd</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>32.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.29x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.47x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio ignore</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>33.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.57x</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio inherit</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>23.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.09x</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio pipe</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>25.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>38.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.68x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio stdin</td>
    <td align="right" style="white-space: nowrap;" nowrap>17.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync timeout</td>
    <td align="right" style="white-space: nowrap;" nowrap>53.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process uid gid options</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process windows hide option</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process windows verbatim option</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>class computed members</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.45x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.80x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>class modifiers</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.29x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>class static blocks</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.20x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.42x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>classes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.89x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.93x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>closure optional parameters</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.52x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.23x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>collection object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.82x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.23x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>comma operator</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.08x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.00x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>computed props</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.92x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.36x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>console format</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto digest base64</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto hash more</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto import</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.78x</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.83x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto random bytes</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto random uuid</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>17.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.27x</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.16x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto sha256</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterable</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator entry destructure</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.31x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator inherited next</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.82x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.02x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator object</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.45x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator self</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.31x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.78x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom predicates</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.51x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date instances</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date parse</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date set time</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date to iso string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date to json</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>36.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.43x</td>
    <td align="right" style="white-space: nowrap;" nowrap>17.22x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date to utc string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.95x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date utc</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.80x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.96x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date utc getters</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.15x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.89x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date utc setters</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.74x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>default parameters</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.29x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.13x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>discriminated unions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.15x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.38x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>31.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.75x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup all</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.94x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup hints</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup option forms</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns promises lookup</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array at</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.27x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.73x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array copy within</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.23x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.71x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array define property</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array fill</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.62x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.12x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array find last</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.45x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array flat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.05x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array flatmap</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.74x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.41x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array hof</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.99x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array hof more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.39x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.03x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array hof refs</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.84x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array keys values</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.50x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.87x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array object enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.78x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.85x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array property writes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array reduce</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.54x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array reduce no initial</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array reduce right</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.23x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.42x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array slice reverse</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.20x</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.37x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array sort</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.58x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array sort comparator</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.72x</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array splice</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.07x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.32x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array spread</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.79x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to reversed</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.52x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to sorted</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.73x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.54x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to sorted comparator</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.18x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to spliced</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.07x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.60x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>34.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.30x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.90x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array value of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.83x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array with</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic bitwise ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.69x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic coercions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic for of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.18x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic for of entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>31.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.13x</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.19x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic for of rest</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.46x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic index assignment</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.84x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic last index of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.11x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.40x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.07x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic number to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.35x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.79x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic object entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.35x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.17x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic object from entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.65x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.38x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.78x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic property assignment</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic property logical assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.22x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.21x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic property ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic search positions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.91x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.78x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string at</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.68x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string code point at</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string concat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.43x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string locale compare</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.94x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.43x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string match</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string match string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string normalize</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.60x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string object enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string pad repeat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.36x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.56x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.81x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.12x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.58x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace regex groups</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>33.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.44x</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.01x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace string tokens</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.83x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string search</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.52x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string split</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.68x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.02x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string split limit</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.61x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.00x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string split regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.32x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.79x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string substr</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.80x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string substring</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.61x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.18x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string trim edges</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.58x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic unary ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.98x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.58x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic update ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.58x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic values</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>enums</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>error constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>error instances</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>error more constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter default max listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter error event</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.63x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter listener count filter</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter max listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.59x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.91x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.49x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.08x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter namespace</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.98x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter once promise</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter once reentrant</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter raw listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter remove latest</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter static listener count</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>exceptions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.45x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.17x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>exponent assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.14x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.19x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>finalization registry</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.76x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.42x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fizzbuzz</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.29x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fn refs</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.49x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.05x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>for in</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs access modes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs access sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs append</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs buffer write append</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs chmod</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs chown</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs copy flags</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs copy rename</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs cp options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs cp recursive</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs cp symlink options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs encoding options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs lchown</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs link</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs link path encoding options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs lstat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs lutimes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs mkdir mode options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs mkdtemp</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs mkdtemp encoding options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises mutation</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises rejections</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readdir dirents</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readdir options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readdir recursive</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readlink</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs realpath</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs recursive options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs roundtrip</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stat options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stats kinds</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stats metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stats times</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs symlink</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs symlink type options</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs sync mutation</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs truncate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs utimes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs write file flags</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>function closures</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.84x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.67x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>function value spread</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.34x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.63x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generator functions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic callbacks</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>20.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.13x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic classes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.35x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic function values</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.20x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic functions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.76x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.63x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.32x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>global number predicates</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.74x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.91x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>greet</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>hello</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.91x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.65x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>in operator narrowing</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.46x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.03x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>inheritance</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.25x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>instanceof</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.35x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>interface inheritance</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.74x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.11x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>interfaces</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.54x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.25x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>json</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.72x</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.98x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>line directives</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.30x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.68x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>logical assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.10x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.54x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map constructor from map</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.68x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map group by</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.84x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.30x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.23x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.04x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set for each</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.32x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.11x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set for each refs</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.93x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set for of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.29x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set same value zero</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.69x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.32x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math constants more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.54x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.12x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math int32 float</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.67x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.56x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default anonymous function</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.83x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.81x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default class import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.38x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.94x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default export assignment</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.29x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default re export</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.37x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module export star</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.64x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.68x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module import aliases</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.31x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module namespace import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.62x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module re exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.36x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.48x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module side effect import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.79x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.01x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module type only import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module type only re export</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.72x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.91x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>modules</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.14x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.60x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>namespaces</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>net is ip</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs bracket exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.91x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs computed exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.33x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.33x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs exports default interop</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.54x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs function scope require</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.22x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.07x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports array</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.31x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.95x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports arrow</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.59x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports function</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.94x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports identifier</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.63x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports nested object default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.27x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.48x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.11x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object arrow</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.10x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object assign default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.52x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.88x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object create default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.07x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.03x</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.94x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object define property default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.69x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object from entries default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.35x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.06x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object function</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.76x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.19x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object literals</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.29x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.39x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object method</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.63x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.88x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports primitives</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.74x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module require</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs package named</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.36x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.21x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.51x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.66x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.45x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.13x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require direct default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require member default</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require destructure</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.33x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.06x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require direct function</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.56x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.40x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require direct member</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.22x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.71x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require direct value</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.26x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.51x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require function</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.85x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.77x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require named</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require side effect</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.12x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs wrapper globals</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.82x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules js package</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.13x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules js package relative import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.98x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.69x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.01x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package imports</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package main</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.94x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.44x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package namespace</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package side effect</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>nullish</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number constants</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.51x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.32x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number constructor</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.04x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number static more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.85x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.19x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number to exponential</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.05x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number to fixed</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.59x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.00x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number to precision</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.23x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor arrows</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>36.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.27x</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.84x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor closures</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.79x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor preserve</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.22x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor redefine</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.83x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.52x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.23x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object array enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.69x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.54x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign array string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.71x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign array target</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.32x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign typed array target</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign typed target</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.26x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.50x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object create descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.80x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object define properties</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object define property</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor defaults</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.80x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor kind transition</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor redefine</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor shorthand</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.21x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.18x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.26x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.25x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.04x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.73x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object from entries map</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object get own property descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.91x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object group by</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object has own property</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.15x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object is</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.87x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object is prototype of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.80x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object primitive extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.77x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object property is enumerable</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.30x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.39x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object prototypes</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.10x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object seal freeze</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.97x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.68x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object static methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.91x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object to locale string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.22x</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.21x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.11x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.91x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object value of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.59x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.99x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>optional parameters</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os dev null</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os host more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os more</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os system stats</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os user info</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path basename suffix</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path constants</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path import</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.90x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.31x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path normalize</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path parse format</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path posix</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path relative</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path to namespaced</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>primitive object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>34.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.28x</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.47x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process argv meta</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process chdir</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.42x</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.77x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process cpu usage</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.53x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.36x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process env mutation</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process features</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process getgroups</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.55x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.88x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process hrtime</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.25x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process hrtime bigint</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.18x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process kill signal zero</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.78x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.94x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process memory usage</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.91x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.73x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.40x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process next tick</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process posix ids</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.36x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process ppid</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.14x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.80x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process release</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process resource usage</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process stdio write</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.87x</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process stdio write buffer</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.90x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.97x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process title</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.12x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.03x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process umask</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.96x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process versions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise any aggregate</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise callback throw</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise empty handlers</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise executor</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise pending combinators</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise race empty pending</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.61x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise resolve adopt</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise settled</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise then passthrough</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect apply</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.73x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect construct</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.90x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.28x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect dynamic</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.26x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect get own property descriptor</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.01x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.08x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect get receiver typed</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect receiver</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.74x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex captures</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.47x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.51x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex pcre2</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp constructor</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.68x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.09x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp exec</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.53x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp extra flags</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.33x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.12x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.05x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>release build</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.47x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.07x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>rest spread</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.48x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.95x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>satisfies expression</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.12x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.13x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set composition</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.76x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.32x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set constructor from set</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.13x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.93x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set keys</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>stdlib os</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string at</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.42x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.33x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string boolean constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string char code at</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.63x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.03x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string codepoints</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string compound plus</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.46x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.02x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string concat</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.32x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.30x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string for of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.21x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.58x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string from code point</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.96x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string last index of</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.53x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string locale compare</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.39x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string match all</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string match string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string normalize</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.25x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.07x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string object enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.73x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.62x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string replace regex groups</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.84x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.62x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string replace string tokens</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.05x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.77x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string search positions</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.96x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.42x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string search regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.84x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string search string</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.26x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string split limit</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.43x</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string substr</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.52x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.20x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string substring</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.55x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.38x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string trim aliases</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.03x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string trim edges</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.65x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.19x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string well formed</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.10x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>strings</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.83x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.14x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>switch</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.81x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>switch exhaustive</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.34x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>symbol bigint object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>symbols</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.78x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>tagged templates</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.63x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.52x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>tail calls</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.28x</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed object has own</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.26x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.02x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.62x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed object property names</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.95x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.66x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed property descriptor</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>30.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.83x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed property descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.15x</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.04x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect get</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.24x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.10x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect has</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.16x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect own keys</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.21x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.96x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect set</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.13</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typeof</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.85x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.84x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typeof boolean union</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.31x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.47x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typeof guards</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.33x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>union narrowing</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.58x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.11x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>url can parse</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>url object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.48x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>url parse</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>void operator</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.73x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.02x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>weak collections</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.95x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>weak ref</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.72x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>wordcount</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap><strong>geomean</strong></td>
    <td align="left" style="white-space: nowrap;" nowrap></td>
    <td align="left" style="white-space: nowrap;" nowrap></td>
    <td align="left" style="white-space: nowrap;" nowrap></td>
    <td align="right" style="white-space: nowrap;" nowrap><strong>5.82x</strong></td>
    <td align="right" style="white-space: nowrap;" nowrap><strong>12.19x</strong></td>
    </tr>
  </tbody>
</table>
</div>

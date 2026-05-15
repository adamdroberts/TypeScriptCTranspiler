# Benchmark Results

Source: `manual-tests/benchmarks/results-full.json`
Generated from benchmark run: `2026-05-15T22:27:43.329Z`
Benchmark source: `all`
Runs per backend: `3`
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
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>arith</td>
    <td align="right" style="white-space: nowrap;" nowrap>57.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>66.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>66.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.15x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.15x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array alloc</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>31.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>17.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.43x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.34x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array hof</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>23.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>23.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.41x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array sort</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>22.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.99x</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.36x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>classes</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>43.64x</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.01x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>closures</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.34x</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>advanced</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.73x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>aggregate error constructor</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>arith</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>35.04x</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.32x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array at</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.74x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.22x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array concat values</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.48x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array copy within</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.44x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array fill</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.41x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array find last</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.88x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array flat</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.55x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from dynamic mapper</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from map</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.46x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from mapper</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.07x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.85x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from set</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.34x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array from string</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.75x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.00x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array hof</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.54x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.46x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array includes same value zero</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.96x</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.05x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array is array narrowing</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.33x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.70x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array keys values</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array last index of</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.71x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array of</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.67x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.03x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array own properties</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.19x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.65x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array property descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.41x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.56x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array reduce no initial</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.12x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array reduce right</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.14x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.40x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array search from index</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.73x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array sort default</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.50x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.72x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array static dynamic</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.45x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to reversed</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.31x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to sorted</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.74</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.42x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.52x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to spliced</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.40x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.25x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.81x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.49x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array value of</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.93x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.36x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>array with</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.71x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.33x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>arrays</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.79x</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.62x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async await immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.48x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async await try catch</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.68x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.86x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async await values immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.14x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.50x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async function immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.59x</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.11x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async function values immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.62x</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.35x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async methods immediate</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.93x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.25x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>async throw rejection</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.08x</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.65x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>base64 globals</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.43x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>bigint</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.53x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.36x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>bitwise assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.11</td>
    <td align="right" style="white-space: nowrap;" nowrap>34.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.01x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.36x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.24x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer alloc unsafe</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.77x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.76x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer base64</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.56x</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.30x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer concat length</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.66x</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.79x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer copy</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.30x</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.93x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer fill</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer float io</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.96x</td>
    <td align="right" style="white-space: nowrap;" nowrap>22.12x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer from buffer</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.20x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer int io</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.58x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.76x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.79x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer search</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.59</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.48x</td>
    <td align="right" style="white-space: nowrap;" nowrap>17.27x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer search more</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.02x</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.02x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer static more</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.67x</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer swap</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.72x</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.47x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer to json</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.47x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.22x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer uint multi io</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.09x</td>
    <td align="right" style="white-space: nowrap;" nowrap>23.19x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer uint8 io</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.27</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.40x</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.90x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>buffer write</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.57x</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.44x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>call arg order</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.34</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.35x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.78x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>captures</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process argv0 options</td>
    <td align="right" style="white-space: nowrap;" nowrap>3172</td>
    <td align="right" style="white-space: nowrap;" nowrap>2658</td>
    <td align="right" style="white-space: nowrap;" nowrap>4864</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.84x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.53x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process env options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4134</td>
    <td align="right" style="white-space: nowrap;" nowrap>7568</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callback encoding</td>
    <td align="right" style="white-space: nowrap;" nowrap>3720</td>
    <td align="right" style="white-space: nowrap;" nowrap>926.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>2978</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.25x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.80x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callback error</td>
    <td align="right" style="white-space: nowrap;" nowrap>407.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>246.2</td>
    <td align="right" style="white-space: nowrap;" nowrap>1141</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.60x</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.80x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callback timeout</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callbacks</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec callbacks cwd</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file callback error</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file callback no args</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file shell</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync cwd</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync input</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync options second arg</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec file sync stderr pipe</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec shell string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync buffer encoding</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync encoding</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process exec sync timeout options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process max buffer options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process numeric kill signal</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process options second arg</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process shell false</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process shell string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync cwd</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync detached</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync detached false</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync exec error</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync input</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync kill signal</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync nonzero status</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync result metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync shell</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync signal</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio default entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio fd</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio ignore</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio inherit</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio pipe</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync stdio stdin</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process spawn sync timeout</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process uid gid options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process windows hide option</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>child process windows verbatim option</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>class computed members</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>class modifiers</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>class static blocks</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>classes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>closure optional parameters</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.56</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>collection object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>7.39</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>comma operator</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>computed props</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>console format</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto digest base64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto hash more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>170.8</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto random bytes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto random uuid</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>89.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>crypto sha256</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterable</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator entry destructure</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator inherited next</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator object</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom iterator self</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>custom predicates</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.55</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date instances</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>283.3</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date parse</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date set time</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date to iso string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date to json</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date to utc string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date utc</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date utc getters</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>date utc setters</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>default parameters</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>discriminated unions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup all</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>56.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup hints</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup option forms</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns lookup options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dns promises lookup</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array at</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>26.99</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array copy within</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array define property</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array fill</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array find last</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array flat</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array flatmap</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array hof</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>196.4</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array hof more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>70.41</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array hof refs</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>23.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array keys values</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array object enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.50</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array property writes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array reduce</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array reduce no initial</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array reduce right</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array slice reverse</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array sort</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array sort comparator</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array splice</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array spread</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to reversed</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to sorted</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to sorted comparator</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to spliced</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>144.1</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array value of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic array with</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic bitwise ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic coercions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic for of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic for of entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic for of rest</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic index assignment</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic last index of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic number to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic object entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic object from entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic property assignment</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic property logical assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic property ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic search positions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string at</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string code point at</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string concat</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string locale compare</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.95</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string match</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string match string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string normalize</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.02</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string object enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string pad repeat</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.09</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace regex groups</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string replace string tokens</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string search</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.47</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string split</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string split limit</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>100.9</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string split regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string substr</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string substring</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic string trim edges</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic unary ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic update ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>dynamic values</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>enums</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>error constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>error instances</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>error more constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.85</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter default max listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter error event</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter listener count filter</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>218.8</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter max listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>103.2</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>129.4</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter namespace</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter once promise</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>331.6</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter once reentrant</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter raw listeners</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter remove latest</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>event emitter static listener count</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>exceptions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>exponent assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>finalization registry</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fizzbuzz</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fn refs</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>59.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>for in</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>103.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs access modes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs access sync</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs append</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs buffer write append</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs chmod</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs chown</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs copy flags</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs copy rename</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs cp options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs cp recursive</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs cp symlink options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs encoding options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs lchown</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs link</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs link path encoding options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs lstat</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs lutimes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs mkdir mode options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs mkdtemp</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs mkdtemp encoding options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises mutation</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs promises rejections</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readdir dirents</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readdir options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readdir recursive</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs readlink</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs realpath</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs recursive options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs roundtrip</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stat</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stat options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stats kinds</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stats metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs stats times</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs symlink</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs symlink type options</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs sync mutation</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs truncate</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs utimes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>fs write file flags</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>function closures</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>function value spread</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generator functions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>206.9</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic callbacks</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>24.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic classes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic function values</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic functions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>generic methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>global number predicates</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>greet</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>hello</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.92x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.97x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>in operator narrowing</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>inheritance</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>instanceof</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>interface inheritance</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>9.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>interfaces</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>json</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>line directives</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>logical assign</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map constructor from map</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map group by</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>268.5</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>32.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set for each</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>72.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set for each refs</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set for of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map set same value zero</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math constants more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math int32 float</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>math more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default anonymous function</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default class import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default export assignment</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.63</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module default re export</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module export star</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module import aliases</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.10</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module namespace import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module re exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module side effect import</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>3750.39x</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.92x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module type only import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>module type only re export</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>modules</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.04</td>
    <td align="right" style="white-space: nowrap;" nowrap>607.56x</td>
    <td align="right" style="white-space: nowrap;" nowrap>12.57x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>namespaces</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.03</td>
    <td align="right" style="white-space: nowrap;" nowrap>2284.78x</td>
    <td align="right" style="white-space: nowrap;" nowrap>44.52x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>net is ip</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs bracket exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs computed exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>115.6</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs exports default interop</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs function scope require</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>237.2</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports array</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>120.7</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports arrow</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports function</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports identifier</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports nested object default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object arrow</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object assign default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.32</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object create default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.26</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object define property default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object from entries default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object function</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object literals</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports object method</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module exports primitives</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>192.7</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs module require</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs package named</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require direct default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>65.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs relative require member default</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require destructure</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require direct function</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require direct member</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>160.2</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require direct value</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require function</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.23</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require named</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs require side effect</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules commonjs wrapper globals</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules js package</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules js package relative import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package exports</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package imports</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package main</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package namespace</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>node modules package side effect</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>nullish</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number constants</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number constructor</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number static more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number to exponential</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number to fixed</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>number to precision</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor arrows</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor closures</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.49</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor preserve</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>16.24</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessor redefine</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object accessors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object array enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.70</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign array string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.69</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign array target</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign typed array target</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object assign typed target</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object create descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.28</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object define properties</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object define property</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor defaults</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>33.40</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor kind transition</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor redefine</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptor shorthand</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object entries</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.21</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object from entries map</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.12</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object get own property descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object group by</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>170.8</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object has own property</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object is</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.82</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object is prototype of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object primitive extensibility</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object property is enumerable</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object prototypes</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>69.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object seal freeze</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object static methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object to locale string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>182.7</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object to string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.90</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>object value of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>optional parameters</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.05</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os dev null</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os host more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os more</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os system stats</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>os user info</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path basename suffix</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path constants</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path import</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>29.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path normalize</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path parse format</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path posix</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path relative</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>path to namespaced</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>primitive object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>167.4</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process argv meta</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process chdir</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>110.6</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process cpu usage</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process env mutation</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process features</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process getgroups</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.93</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process hrtime</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process hrtime bigint</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process kill signal zero</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.44</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process memory usage</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>21.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process metadata</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process next tick</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>100.5</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process posix ids</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process ppid</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process release</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process resource usage</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.79</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process stdio write</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.57</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process stdio write buffer</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.01</td>
    <td align="right" style="white-space: nowrap;" nowrap>265.06x</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.43x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process title</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process umask</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.18</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>process versions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.75</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise any aggregate</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>8.19</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise callback throw</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise empty handlers</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>10.46</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise executor</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>99.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise pending combinators</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>11.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise race empty pending</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.53</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise resolve adopt</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.60</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise settled</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>90.43</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>promise then passthrough</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.77</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect apply</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect construct</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect dynamic</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.33</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect get own property descriptor</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.97</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect get receiver typed</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>reflect receiver</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>111.4</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex captures</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>3.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex pcre2</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>120.3</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp constructor</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.36</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp exec</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp extra flags</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.48</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regexp object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>15.22</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>release build</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.92</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>rest spread</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.45</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>satisfies expression</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set composition</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>253.6</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set constructor from set</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>27.07</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set keys</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>stdlib os</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string at</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.64</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string boolean constructors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string char code at</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string codepoints</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.98</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string compound plus</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.37</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string concat</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.68</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string for of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>23.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string from code point</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.94</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string last index of</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.73</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string locale compare</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>18.14</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string match all</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.58</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string match string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string normalize</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string object enumeration</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.15</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string replace regex groups</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>58.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string replace string tokens</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.62</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string search positions</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.83</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string search regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.51</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string search string</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string split limit</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string substr</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string substring</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.80</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string trim aliases</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string trim edges</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.91</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string well formed</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.88</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>strings</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.30</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>switch</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>switch exhaustive</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.20</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>symbol bigint object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>706.6</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>symbols</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.84</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>tagged templates</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.72</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>tail calls</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed object has own</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.29</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.52</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed object property names</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed property descriptor</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.54</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed property descriptors</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.96</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect get</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.66</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect has</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.87</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect own keys</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.38</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typed reflect set</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.31</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typeof</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.35</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typeof boolean union</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.65</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>typeof guards</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.17</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>union narrowing</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.71</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>url can parse</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.78</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>url object methods</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.42</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>url parse</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>19.06</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>void operator</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.67</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>weak collections</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.81</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>weak ref</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.61</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>wordcount</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    <td align="right" style="white-space: nowrap;" nowrap>-</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>exceptions</td>
    <td align="right" style="white-space: nowrap;" nowrap>60.89</td>
    <td align="right" style="white-space: nowrap;" nowrap>844.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>267.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>13.86x</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.38x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>json</td>
    <td align="right" style="white-space: nowrap;" nowrap>43.16</td>
    <td align="right" style="white-space: nowrap;" nowrap>28.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>45.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.65x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.04x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>map ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>46.25</td>
    <td align="right" style="white-space: nowrap;" nowrap>658.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>305.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>14.23x</td>
    <td align="right" style="white-space: nowrap;" nowrap>6.59x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>recursion</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.08</td>
    <td align="right" style="white-space: nowrap;" nowrap>7624</td>
    <td align="right" style="white-space: nowrap;" nowrap>10051</td>
    <td align="right" style="white-space: nowrap;" nowrap>1867.70x</td>
    <td align="right" style="white-space: nowrap;" nowrap>2462.25x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>regex</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.86</td>
    <td align="right" style="white-space: nowrap;" nowrap>4.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>2.14x</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.07x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>set ops</td>
    <td align="right" style="white-space: nowrap;" nowrap>230.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>1375</td>
    <td align="right" style="white-space: nowrap;" nowrap>37.00</td>
    <td align="right" style="white-space: nowrap;" nowrap>5.98x</td>
    <td align="right" style="white-space: nowrap;" nowrap>0.16x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap>string concat</td>
    <td align="right" style="white-space: nowrap;" nowrap>1.76</td>
    <td align="right" style="white-space: nowrap;" nowrap>229.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>116.0</td>
    <td align="right" style="white-space: nowrap;" nowrap>129.93x</td>
    <td align="right" style="white-space: nowrap;" nowrap>65.82x</td>
    </tr>
    <tr>
    <td align="left" style="min-width: 70ch; white-space: nowrap;" nowrap><strong>geomean</strong></td>
    <td align="left" style="white-space: nowrap;" nowrap></td>
    <td align="left" style="white-space: nowrap;" nowrap></td>
    <td align="left" style="white-space: nowrap;" nowrap></td>
    <td align="right" style="white-space: nowrap;" nowrap><strong>4.02x</strong></td>
    <td align="right" style="white-space: nowrap;" nowrap><strong>2.34x</strong></td>
    </tr>
  </tbody>
</table>
</div>

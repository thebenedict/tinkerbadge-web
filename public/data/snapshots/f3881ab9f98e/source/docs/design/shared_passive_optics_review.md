# Shared passive sensor placement review

10 November 2026. **Pass for the four-part placement delta and experimental development use.** U501 and its two capacitors fit beside the lower IR receiver. Moving R504 leaves an empty PCB corridor for a future barrier between the passive sensors and IR transmitter. Human placement approval remains required before detailed routing.

## Reviewed revision and changes

Baseline board SHA256: `a7ac2778f423c3847b9a3a6200f00446d6a960bbee242b6ef8da7aff5ed24b84`.

Saved candidate: `.build/shared-optics-one-sided/tinkerbadge.kicad_pcb`, SHA256 `ddf824f2a59bc82568bbb03bcb3f89959f2ee12638b380790207739273c1844d`.

| Reference | X mm | Y mm | Rotation |
|---|---:|---:|---:|
| U501 | 143.50 | 170.50 | 90° |
| C501 | 143.50 | 174.75 | 270° |
| C502 | 143.50 | 166.25 | 90° |
| R504 | 150.75 | 172.00 | 180° |

All remain on F.Cu. IR receiver/emitter, LEDs and their capacitors, and all other component poses are unchanged.

## Independent native checks

KiCad 10.0.8 readback and complete inverse-pose comparisons passed for all 186 footprints. Every footprint field, graphic, pad/net assignment, model and UUID matches after restoring its baseline pose in memory. Only attribute/item serialization order is normalized; ordered vertices remain ordered. All non-footprint board content, including nets, groups, outline, setup and rule areas, is unchanged. Native group sanity passes.

- Zero positive-area same-side courtyard intersections across 177 front and nine rear courtyards.
- No moved copper outside the board or in radio/NFC keepouts. Minimum moved copper-to-edge clearance is 4.025 mm at C501, above the unchanged 0.5 mm rule.
- U501/U504 courtyard gap is 0.460 mm. U501 courtyard is 3.655 mm below the glass edge.
- C501.1 to U501.1 is 2.159 mm; C502.1 to U501.5 is 2.100 mm. Keep these bypass branches short and give their ground pads and U501 ground a direct plane return, separate from LED/transmitter pulse-current paths.
- R504.2 to D501.1 is 3.747 mm. Preserve the compact transmitter supply/resistor/emitter/switch loop.
- The evaluated divider corridor x146.6..147.1/y165.25..175.75 has no front courtyard or pad intersection and lies within the board. This is space for enclosure development, not an implemented wall or keepout.
- All 54 staged dependency files match the baseline project. All 167 model assignments resolve to 33 distinct files.
- One closed 110 × 80 mm outline, four copper layers and zero tracks/vias remain.

C502's courtyard reaches y164.725, overlapping the glass projection by 0.175 mm. It is a support capacitor, not an optical opening. Qualify its actual package height, glass tolerances and nearby supports before assembly.

The independent DRC rerun matches the staged report: four existing USB hole-clearance errors, one existing radio silkscreen-edge warning, 390 unconnected items and nine missing-footprint parity warnings. Violation/parity types, severity, descriptions and affected UUIDs match the previous placement. Fifteen unrouted endpoint pairs change with placement; the unconnected count and native net assignments are unchanged. The board is not DRC-clean.

Machine evidence: `.build/shared-optics/independent_audit.json`; checker: `.build/shared-optics/check_independent.py`; independently rerun DRC: `.build/shared-optics/independent_drc.json`. Source-board and candidate hashes were unchanged after inspection. Fresh render inspection is handled separately by the implementing reviewer; this review does not claim visual acceptance.

## Optical design recommendation

**Let the ALS and IR receiver share one passive-sensor aperture.** Neither emits light, so mutual optical crosstalk does not require a divider. The cover must transmit visible light for U501 and 940 nm for U504; the receiver package already contains an IR-filtering epoxy. Give D501 a physically separate optical window and seal the sensor compartment from the affinity-light diffuser. An opaque divider beneath a continuous transparent panel may still permit internal reflections through that panel.

ROHM locates U501's detector at body center and requires illumination over a 0.8 mm diameter region. Its native rotation introduces no optical-center offset. The receiver's lens center is approximately (137.75,169.38), using its manufacturer-drawn 0.88 mm offset rather than the simplified fabrication-circle offset.

The lower ALS has better display-side clearance: a point-ray example at z0.75 mm and glass upper surface z5.42 mm gives a northward shadow threshold of 50.2°, versus 20.5° at the previous top position. Package maximum height is not a guaranteed detector plane, and this is not a system FOV prediction.

A shared passive cavity removes the unnecessary ALS/RX divider restriction. Conservatively enclosing the receiver body/lens to x139.85 and z4.3, and starting a ray at the nearest edge of the ALS's 0.8 mm region at z0, gives a receiver-shadow threshold of about 37.1°. This supports a roughly ±30° enclosure design target, subject to assembly and optical verification.

The transmitter divider and cover remain limiting. If the limiting aperture plane is z5.42 and the ALS optical-plane example is z0.75, covering the full 0.8 mm region at 30° requires its right boundary near x146.596; 35° requires x147.170. Thus the proposed corridor offers approximately 30° nominal clearance toward the transmitter, without established tolerance margin. A lower cover or revised partition profile may improve it. Cover thickness, refraction and alignment must be included in the final aperture design. The emitter's existing display-side shadow near 45.6° remains, and its divider can also clip inward emission.

U501 is now 12.02 mm from D406 and 12.50 mm from D405, versus approximately 15.89 mm from the prior location to D401. The move consolidates optics; it does not establish reduced RGB contamination. Test final-enclosure readings with RGB off/on across colors and brightness. Keep local IR transmission off throughout ALS integration, and evaluate whether periodic RGB blanking is needed. Test sunlight, badge tilt, self-reception, receiver recovery and communication range with the assembled cover and display.

## Sources

- [ROHM BH1730FVC, Rev.001, 8 June 2016](https://fscdn.rohm.com/en/products/databook/datasheet/ic/sensor/light/bh1730fvc-e.pdf): pp4–5 spectral response, p9 integration, p13 window-dependent lux calculation, p14 optical region, p19 package.
- [Everlight IRM-H638T/TR2, DMO-0000008 Rev3, 1 January 2025](https://www.everlighteurope.com/custom/files/datasheets/DMO-0000008.pdf): p1 IR-filter package, p3 typical angular response, p6 lens dimensions.
- [Everlight IR67-21C/TR8, DIR-0000986 Rev3, 10 July 2013](https://www.everlighteurope.com/custom/files/datasheets/DIR-0000986.pdf): pp2–3 package and typical 120° viewing angle.
- [Vishay application note 82904, 29 October 2024](https://www.vishay.com/docs/82904/irreceiversprecencesensorapps.pdf), p11: emitter/detector isolation and reflections through a common panel. General optical guidance, not qualification of these Everlight parts.
- [TI SBEA002B, revised June 2026](https://www.ti.com.cn/lit/an/sbea002b/sbea002b.pdf?ts=1793569147535), pp8–15: generic window/FOV geometry. The ±30° target is an engineering choice, not a BH1730 manufacturer-specified FOV.

All three exact-part archived PDF hashes match their source records. The prior [lower IR review](lower_ir_placement_review.md) remains applicable to unchanged IR circuitry, grounding, NFC, battery and dock gates.

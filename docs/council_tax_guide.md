# UK Council Tax: Rules TrueCost Implements

The rules below are implemented in `packages/core` and covered by its tests.
Northern Ireland uses domestic rates, not council tax, and is out of scope.

## 1. Bands

Every home is placed in a valuation band. Each band pays a fixed fraction of
the area's Band D charge.

| Band | England (1991 values) | Wales (2003 values) | Scotland (1991 values, since April 2017) |
|------|-----------------------|---------------------|------------------------------------------|
| A    | 6/9                   | 6/9                 | 240/360                                  |
| B    | 7/9                   | 7/9                 | 280/360                                  |
| C    | 8/9                   | 8/9                 | 320/360                                  |
| D    | 9/9                   | 9/9                 | 360/360                                  |
| E    | 11/9                  | 11/9                | 473/360                                  |
| F    | 13/9                  | 13/9                | 585/360                                  |
| G    | 15/9                  | 15/9                | 705/360                                  |
| H    | 18/9                  | 18/9                | 882/360                                  |
| I    | n/a                   | 21/9                | n/a                                      |

Scotland's E–H proportions differ from England's. Scottish bills also include
water and sewerage charges, which TrueCost does not model yet.

## 2. What makes up Band D

The Band D charge for an address is the sum of every body that precepts on it:

- the billing authority (district, borough, unitary or Welsh county council)
- parish, town or community council precepts, which differ from parish to parish
- the county council or Greater London Authority
- police, fire, and combined authority precepts

Government tables publish an **area average** Band D for each billing
authority. In 81 of the 318 authorities in England and Wales there are no
parish precepts or special expenses, so the average is the exact charge. In
the rest the exact charge depends on the parish, and TrueCost labels the
figure as an estimate (`AuthorityRate.variesWithinArea`).

## 3. Discounts and exemptions

Full-time students are disregarded when counting adults:

- **Everyone is a full-time student**: exempt (100%).
- **One adult counts**: 25% single person discount. This includes one worker
  living with students.
- **Two or more count**: full charge.

Not modelled yet: other disregarded groups (apprentices, carers, severe mental
impairment, some care leavers), means-tested Council Tax Reduction schemes, and
rooms in a house in multiple occupation, where the landlord is usually liable.

## 4. Billing

The tax year runs 1 April to 31 March. Councils bill in **10 monthly
instalments** (April to January) unless the resident asks for 12. TrueCost
shows the 12-month average for budgeting and the approximate 10-month
instalment the renter will actually see.

## 5. Data sources

All Open Government Licence. Raw files and their URLs are kept in
`server/data/raw/<tax year>/` so every figure can be traced.

| Nation  | Source | Published |
|---------|--------|-----------|
| England | MHCLG, *Council Tax levels set by local authorities*, Table 10 | late March |
| Wales   | Welsh Government, *Council Tax levels*, Table 1 | late March |

### Updating for a new tax year

1. Download the new files into `server/data/raw/<year>/` and write its `sources.json`.
2. `npm run import:rates -- <year>`. It fails if columns move or components don't add up.
3. Point `server/src/data/rates/index.ts` at the new JSON and update the tests.

Until step 3 is done the API returns `isCurrentYear: false` and the UI warns
that the rates are last year's.
